import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ContactUploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);
        toast({
          title: "Arquivo selecionado",
          description: `${selectedFile.name} foi carregado com sucesso.`,
        });
      } else {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo CSV.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({
        title: "Arquivo necessário",
        description: "Por favor, selecione um arquivo CSV com os contatos.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Mensagem necessária",
        description: "Por favor, insira uma mensagem inicial.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Here you would integrate with your n8n webhook
      // Example: await fetch('your-n8n-webhook-url', { method: 'POST', body: formData })
      
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Sucesso!",
        description: "As ligações foram iniciadas. Você receberá atualizações em breve.",
      });

      // Reset form
      setFile(null);
      setMessage("");
      const fileInput = document.getElementById("file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar sua solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactCount = file ? "10 Contatos para ligar" : "Aguardando arquivo CSV";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-lg border-border">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Ativação Carol
            </h1>
            <p className="text-muted-foreground">{contactCount}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="text-foreground font-medium">
                Contatos <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-secondary/50 transition-colors"
                >
                  {file ? (
                    <>
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-sm text-foreground">{file.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Escolher arquivo CSV
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Message Textarea */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-foreground font-medium">
                Mensagem inicial <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem personalizada aqui..."
                className="min-h-[120px] resize-none border-input focus:border-primary focus:ring-primary"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6 text-lg rounded-lg transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Form automated with{" "}
              <span className="font-semibold text-foreground">n8n</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactUploadForm;
