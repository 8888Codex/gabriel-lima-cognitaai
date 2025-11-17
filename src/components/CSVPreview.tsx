import { Card, CardGradient, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Contact {
  name: string;
  phone: string;
  email?: string;
  status?: "pending" | "sending" | "sent" | "failed";
  retryCount?: number;
  [key: string]: string | number | undefined;
}

interface CSVPreviewProps {
  contacts: Contact[];
  totalCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isValid: boolean;
  errorMessage?: string;
}

const CSVPreview = ({ contacts, totalCount, onConfirm, onCancel, isValid, errorMessage }: CSVPreviewProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isValid ? (
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {isValid ? "Arquivo validado" : "Erro no arquivo"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isValid ? `${totalCount} contatos encontrados` : errorMessage}
            </p>
          </div>
        </div>
        <Badge variant={isValid ? "default" : "destructive"} className="text-xs">
          {isValid ? "Válido" : "Inválido"}
        </Badge>
      </div>

      {isValid && contacts.length > 0 && (
        <CardGradient>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              Preview dos primeiros contatos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.map((contact, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.phone}</p>
                  {contact.email && (
                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  #{index + 1}
                </Badge>
              </div>
            ))}
            {totalCount > contacts.length && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                + {totalCount - contacts.length} contatos adicionais
              </p>
            )}
          </CardContent>
        </CardGradient>
      )}

      <div className="flex gap-3">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 py-6 rounded-xl font-semibold"
        >
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!isValid}
          variant="gradient"
          className="flex-1 py-6 rounded-xl font-semibold disabled:opacity-50"
        >
          Confirmar e enviar
        </Button>
      </div>
    </div>
  );
};

export default CSVPreview;
