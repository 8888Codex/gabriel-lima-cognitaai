import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardGradient, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CheckCircle2, Phone, PhoneOutgoing } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProgressSteps from "@/components/ProgressSteps";
import SuccessScreen from "@/components/SuccessScreen";
import CSVPreview from "@/components/CSVPreview";
import { parseCSV } from "@/utils/campaignCsvParser";
import OutboundCallManager from "@/components/OutboundCallManager";
interface Contact {
  name: string;
  phone: string;
  email?: string;
  status?: "pending" | "sending" | "sent" | "failed";
  retryCount?: number;
  [key: string]: string | number | undefined;
}
const ContactUploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(false);
  const [currentContactIndex, setCurrentContactIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [campaignData, setCampaignData] = useState({
    contactCount: 0,
    startTime: ""
  });
  const [showPreview, setShowPreview] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isValidCSV, setIsValidCSV] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState(false);
  const {
    toast
  } = useToast();

  // Load Vapi credentials from localStorage
  const vapiCredentials = localStorage.getItem('vapi_credentials');
  const vapiConfig = vapiCredentials ? JSON.parse(vapiCredentials) : {};
  const vapiPublicKey = vapiConfig.publicKey || '';
  const vapiAssistantId = vapiConfig.assistantId || '';
  const vapiPhoneNumberId = vapiConfig.phoneNumberId || '';
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);

        try {
          // Parse and validate CSV
          const text = await selectedFile.text();
          const result = parseCSV(text);
          
          const parsedContacts = result.contacts.map(contact => ({
            name: contact.customer_name || '',
            phone: contact.customer_phone,
            email: contact.customer_email || '',
            status: 'pending' as const
          }));
          
          setContacts(parsedContacts);
          setIsValidCSV(true);
          setCsvError("");
          setShowPreview(true);
          
          if (result.errors.length > 0) {
            console.warn('Avisos ao processar CSV:', result.errors);
          }
          
          toast({
            title: "Arquivo validado",
            description: `${parsedContacts.length} contatos encontrados.`
          });
        } catch (error: any) {
          setContacts([]);
          setIsValidCSV(false);
          setCsvError(error.message || "Erro ao processar arquivo");
          setShowPreview(true);
          toast({
            title: "Erro no arquivo",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo CSV.",
          variant: "destructive"
        });
      }
    }
  };
  const handlePreviewConfirm = () => {
    setShowPreview(false);
  };
  const handlePreviewCancel = () => {
    setFile(null);
    setContacts([]);
    setIsValidCSV(false);
    setCsvError("");
    setShowPreview(false);
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "Arquivo necessário",
        description: "Por favor, selecione um arquivo CSV com os contatos.",
        variant: "destructive"
      });
      return;
    }
    if (!message.trim()) {
      toast({
        title: "Mensagem necessária",
        description: "Por favor, insira uma mensagem inicial.",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    setSendingProgress(true);
    
    try {
      // Initialize all contacts with pending status
      const contactsWithStatus = contacts.map(c => ({ ...c, status: "pending" as const }));
      setContacts(contactsWithStatus);

      const startTime = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      });

      // Get webhook URL from localStorage or use default
      const webhookConfig = localStorage.getItem('webhook_config');
      const webhookUrl = webhookConfig 
        ? JSON.parse(webhookConfig).url 
        : "https://nwhminds.cognitaai.com.br/webhook/ativacao-carol";
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 2000; // 2 seconds between retries
      const REQUEST_TIMEOUT = 10000; // 10 seconds timeout
      
      console.log("🚀 Iniciando envio de mensagens para webhook:", webhookUrl);
      console.log("📊 Total de contatos:", contactsWithStatus.length);
      console.log("📝 Mensagem:", message.trim());
      
      for (let i = 0; i < contactsWithStatus.length; i++) {
        // Wait if paused
        while (isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        let retryCount = 0;
        let success = false;
        
        console.log(`\n📤 [${i + 1}/${contactsWithStatus.length}] Processando contato:`, contactsWithStatus[i]);

        while (retryCount <= MAX_RETRIES && !success) {
          // Update current contact to "sending"
          setContacts(prev => 
            prev.map((c, idx) => 
              idx === i ? { ...c, status: "sending" as const, retryCount } : c
            )
          );
          setCurrentContactIndex(i);

          try {
            const payload = {
              contact: {
                name: contactsWithStatus[i].name,
                phone: contactsWithStatus[i].phone,
                email: contactsWithStatus[i].email || '',
              },
              message: message.trim(),
              timestamp: new Date().toISOString(),
              contactIndex: i + 1,
              totalContacts: contactsWithStatus.length,
              retryAttempt: retryCount,
            };
            
            console.log(`📨 [Tentativa ${retryCount + 1}/${MAX_RETRIES + 1}] Enviando payload:`, JSON.stringify(payload, null, 2));

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              console.log(`⏱️ Timeout atingido (${REQUEST_TIMEOUT}ms) para ${contactsWithStatus[i].name}`);
              controller.abort();
            }, REQUEST_TIMEOUT);

            // Send data to webhook
            const response = await fetch(webhookUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            console.log(`📥 Resposta recebida - Status: ${response.status} ${response.statusText}`);
            console.log(`📥 Headers:`, Object.fromEntries(response.headers.entries()));

            // Try to read response body
            try {
              const responseText = await response.text();
              console.log("📄 Resposta do webhook (texto):", responseText);
              
              if (responseText) {
                try {
                  const responseData = JSON.parse(responseText);
                  console.log("📄 Resposta do webhook (JSON):", JSON.stringify(responseData, null, 2));
                } catch (e) {
                  console.log("⚠️ Resposta não é JSON válido");
                }
              }
            } catch (e) {
              console.log("⚠️ Não foi possível ler o corpo da resposta:", e);
            }

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }

            console.log(`✅ [${i + 1}/${contactsWithStatus.length}] Sucesso para ${contactsWithStatus[i].name}${retryCount > 0 ? ` (após ${retryCount} tentativa${retryCount > 1 ? 's' : ''})` : ''}`);
            success = true;

            // Update current contact to "sent"
            setContacts(prev => 
              prev.map((c, idx) => 
                idx === i ? { ...c, status: "sent" as const, retryCount } : c
              )
            );

            toast({
              title: "Mensagem enviada",
              description: `Enviado para ${contactsWithStatus[i].name}`,
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isTimeout = error instanceof Error && error.name === 'AbortError';
            
            console.error(`❌ [${i + 1}/${contactsWithStatus.length}] Erro (tentativa ${retryCount + 1}/${MAX_RETRIES + 1}):`, {
              contato: contactsWithStatus[i].name,
              erro: errorMessage,
              tipo: isTimeout ? 'Timeout' : 'Erro de requisição',
              stack: error instanceof Error ? error.stack : undefined
            });
            
            retryCount++;

            if (retryCount > MAX_RETRIES) {
              // All retries failed
              console.error(`💥 [${i + 1}/${contactsWithStatus.length}] Falha definitiva para ${contactsWithStatus[i].name} após ${MAX_RETRIES + 1} tentativas`);
              
              setContacts(prev => 
                prev.map((c, idx) => 
                  idx === i ? { ...c, status: "failed" as const, retryCount } : c
                )
              );

              toast({
                title: "Falha no envio",
                description: `Não foi possível enviar para ${contactsWithStatus[i].name} após ${MAX_RETRIES + 1} tentativas${isTimeout ? ' (timeout)' : ''}`,
                variant: "destructive"
              });
            } else {
              // Wait before retrying
              console.log(`🔄 Aguardando ${RETRY_DELAY}ms antes de tentar novamente...`);
              
              toast({
                title: "Tentando novamente",
                description: `Reenviando para ${contactsWithStatus[i].name} (tentativa ${retryCount + 1})`,
              });
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
          }
        }

        // Small delay between contacts to avoid overwhelming the webhook
        if (success) {
          console.log(`⏳ Aguardando 500ms antes do próximo contato...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log("🎉 Processo de envio finalizado!");

      setCurrentContactIndex(contactsWithStatus.length);
      
      setCampaignData({
        contactCount: contactsWithStatus.length,
        startTime
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setShowSuccess(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar sua solicitação. Tente novamente.",
        variant: "destructive"
      });
      setCurrentStep(0);
    } finally {
      setIsSubmitting(false);
      setSendingProgress(false);
    }
  };
  const handleNewCampaign = () => {
    setShowSuccess(false);
    setFile(null);
    setMessage("");
    setCurrentStep(0);
    setContacts([]);
    setIsValidCSV(false);
    setCsvError("");
    setShowPreview(false);
    setSendingProgress(false);
    setCurrentContactIndex(0);
    setIsPaused(false);
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };
  const contactCount = file && contacts.length > 0 ? `${contacts.length} Contatos para ligar` : "Aguardando arquivo CSV";
  if (showSuccess) {
    return <SuccessScreen contactCount={campaignData.contactCount} startTime={campaignData.startTime} onNewCampaign={handleNewCampaign} />;
  }
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4 animate-fade-in">
      <div className="w-full max-w-lg">
        {/* Header with icon */}
        <div className="text-center mb-6 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Phone className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
            Ativação Carol
          </h1>
          <p className="text-base text-muted-foreground font-medium">{contactCount}</p>
        </div>

        <CardGradient 
          className="shadow-2xl backdrop-blur-sm animate-slide-up" 
          animate={sendingProgress}
          style={{
            animationDelay: "0.1s"
          }}
        >
          <CardContent className="p-8">
            {sendingProgress ? <div className="py-4">
                <ProgressSteps 
                  contacts={contacts} 
                  currentIndex={currentContactIndex} 
                  isPaused={isPaused}
                  onTogglePause={() => setIsPaused(!isPaused)}
                />
              </div> : showPreview ? <CSVPreview contacts={contacts.slice(0, 5)} totalCount={contacts.length} onConfirm={handlePreviewConfirm} onCancel={handlePreviewCancel} isValid={isValidCSV} errorMessage={csvError} /> : <form onSubmit={handleSubmit} className="space-y-7">
                {/* File Upload */}
                <div className="space-y-3">
                  <Label htmlFor="file-upload" className="text-foreground font-semibold text-sm flex items-center gap-1">
                    Contatos <span className="text-destructive text-base">*</span>
                  </Label>
                  <div className="relative group">
                    <input id="file-upload" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                    <label htmlFor="file-upload" className={`
                        flex items-center justify-center gap-3 w-full px-5 py-5 
                        border-2 border-dashed rounded-xl cursor-pointer 
                        transition-all duration-300 ease-out
                        ${file ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/60 hover:bg-secondary/60 hover:shadow-md'}
                        group-hover:scale-[1.01]
                      `}>
                      {file ? <>
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Arquivo carregado com sucesso</p>
                          </div>
                        </> : <>
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                            <Upload className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-foreground">Escolher arquivos</p>
                            <p className="text-xs text-muted-foreground mt-0.5">ou arraste e solte aqui</p>
                          </div>
                        </>}
                    </label>
                    {!file && <p className="text-xs text-muted-foreground mt-2 ml-1">
                        Formatos aceitos: .csv
                      </p>}
                  </div>
                </div>

                {/* Message Textarea */}
                <div className="space-y-3">
                  <Label htmlFor="message" className="text-foreground font-semibold text-sm flex items-center gap-1">
                    Mensagem inicial <span className="text-destructive text-base">*</span>
                  </Label>
                  <Textarea id="message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Digite sua mensagem personalizada que será enviada aos contatos..." className="min-h-[140px] resize-none border-input focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-200 text-sm leading-relaxed" />
                  <p className="text-xs text-muted-foreground ml-1">
                    {message.length}/1000 caracteres
                  </p>
                </div>

                {/* Submit Button */}
                <Button type="submit" disabled={isSubmitting} variant="gradient" className="w-full font-semibold py-7 text-base rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                  Submit
                </Button>
                
                {/* Outbound Calling Button */}
                {isValidCSV && contacts.length > 0 && !sendingProgress && (
                  <Button 
                    type="button"
                    onClick={() => setIsOutboundModalOpen(true)}
                    variant="outline"
                    className="w-full font-semibold py-7 text-base rounded-xl"
                  >
                    <PhoneOutgoing className="mr-2 h-5 w-5" />
                    Fazer Chamadas Outbound
                  </Button>
                )}
              </form>}
          </CardContent>
        </CardGradient>

        {/* Footer */}
        <div className="mt-6 text-center animate-slide-up" style={{
        animationDelay: "0.2s"
      }}>
          <p className="text-xs text-muted-foreground font-medium">
            Carol.ai - Ativação Inteligente
          </p>
        </div>
      </div>
      
      {/* Outbound Call Manager Modal */}
      <OutboundCallManager
        open={isOutboundModalOpen}
        onOpenChange={setIsOutboundModalOpen}
        contacts={contacts}
        publicKey={vapiPublicKey}
        assistantId={vapiAssistantId}
        phoneNumberId={vapiPhoneNumberId}
      />
    </div>;
};
export default ContactUploadForm;