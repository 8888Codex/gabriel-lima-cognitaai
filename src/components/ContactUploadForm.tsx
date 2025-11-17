import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CheckCircle2, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProgressSteps from "@/components/ProgressSteps";
import SuccessScreen from "@/components/SuccessScreen";
import CSVPreview from "@/components/CSVPreview";
import { parseCSV } from "@/utils/csvParser";
interface Contact {
  name: string;
  phone: string;
  status?: "pending" | "sending" | "sent";
  [key: string]: string;
}
const ContactUploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(false);
  const [currentContactIndex, setCurrentContactIndex] = useState(0);
  const [campaignData, setCampaignData] = useState({
    contactCount: 0,
    startTime: ""
  });
  const [showPreview, setShowPreview] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isValidCSV, setIsValidCSV] = useState(false);
  const [csvError, setCsvError] = useState("");
  const {
    toast
  } = useToast();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);

        // Parse and validate CSV
        const result = await parseCSV(selectedFile);
        if (result.isValid) {
          setContacts(result.contacts);
          setIsValidCSV(true);
          setCsvError("");
          setShowPreview(true);
          toast({
            title: "Arquivo validado",
            description: `${result.contacts.length} contatos encontrados.`
          });
        } else {
          setContacts([]);
          setIsValidCSV(false);
          setCsvError(result.errorMessage || "Erro ao processar arquivo");
          setShowPreview(true);
          toast({
            title: "Erro no arquivo",
            description: result.errorMessage,
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

      // Simulate sending messages one by one
      for (let i = 0; i < contactsWithStatus.length; i++) {
        // Update current contact to "sending"
        setContacts(prev => 
          prev.map((c, idx) => 
            idx === i ? { ...c, status: "sending" as const } : c
          )
        );
        setCurrentContactIndex(i);

        // Simulate API call delay (1-2 seconds per message)
        await new Promise(resolve => 
          setTimeout(resolve, 1000 + Math.random() * 1000)
        );

        // Update current contact to "sent"
        setContacts(prev => 
          prev.map((c, idx) => 
            idx === i ? { ...c, status: "sent" as const } : c
          )
        );
      }

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

        <Card className="shadow-2xl border-border/50 backdrop-blur-sm bg-card/95 animate-slide-up" style={{
        animationDelay: "0.1s"
      }}>
          <CardContent className="p-8">
            {sendingProgress ? <div className="py-4">
                <ProgressSteps contacts={contacts} currentIndex={currentContactIndex} />
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
                <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-7 text-base rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                  Submit
                </Button>
              </form>}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center animate-slide-up" style={{
        animationDelay: "0.2s"
      }}>
          
        </div>
      </div>
    </div>;
};
export default ContactUploadForm;