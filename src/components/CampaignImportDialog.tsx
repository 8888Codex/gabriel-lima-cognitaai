import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseCSV, downloadCSVTemplate, CSVContact } from "@/utils/campaignCsvParser";
import { Upload, Download, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CampaignImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (contacts: CSVContact[]) => void;
}

export const CampaignImportDialog = ({ open, onOpenChange, onImport }: CampaignImportDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [contacts, setContacts] = useState<CSVContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setIsProcessing(true);

    try {
      const text = await selectedFile.text();
      const result = parseCSV(text);
      setContacts(result.contacts);
      
      if (result.errors.length > 0) {
        console.warn('Avisos ao processar CSV:', result.errors);
      }
    } catch (err: any) {
      setError(err.message);
      setContacts([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    if (contacts.length === 0) {
      setError('Nenhum contato para importar');
      return;
    }

    onImport(contacts);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setContacts([]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Contatos CSV</DialogTitle>
          <DialogDescription>
            Importe uma lista de contatos em formato CSV para adicionar à fila de chamadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Template CSV</p>
                <p className="text-xs text-muted-foreground">
                  Baixe um modelo com o formato correto
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCSVTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">Arquivo CSV</Label>
            <div className="flex gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
              {file && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    setContacts([]);
                    setError(null);
                  }}
                >
                  ×
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Formato: name,phone,email,priority
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {contacts.length > 0 && (
            <div className="space-y-2">
              <Label>Preview ({contacts.length} contatos)</Label>
              <ScrollArea className="h-48 border rounded-lg p-3">
                <div className="space-y-2">
                  {contacts.slice(0, 10).map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {contact.customer_name || 'Sem nome'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.customer_phone}
                          {contact.customer_email && ` • ${contact.customer_email}`}
                        </p>
                      </div>
                      {contact.priority !== undefined && contact.priority > 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          Prioridade: {contact.priority}
                        </span>
                      )}
                    </div>
                  ))}
                  {contacts.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ... e mais {contacts.length - 10} contatos
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={contacts.length === 0 || isProcessing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar {contacts.length > 0 ? `${contacts.length} Contatos` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
