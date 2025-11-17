import { CheckCircle2, Clock, Loader2, Pause, Play } from "lucide-react";
import { Card, CardGradient, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface Contact {
  name: string;
  phone: string;
  status?: "pending" | "sending" | "sent";
}

interface ProgressStepsProps {
  contacts: Contact[];
  currentIndex: number;
  isPaused: boolean;
  onTogglePause: () => void;
}

const ProgressSteps = ({ contacts, currentIndex, isPaused, onTogglePause }: ProgressStepsProps) => {
  const progress = (currentIndex / contacts.length) * 100;

  return (
    <CardGradient>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-3">
            <span>Enviando Mensagens</span>
            <Button
              onClick={onTogglePause}
              variant="outline"
              size="sm"
              className="h-8 gap-2"
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4" />
                  Retomar
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  Pausar
                </>
              )}
            </Button>
          </CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            {currentIndex} de {contacts.length}
          </span>
        </div>
        {isPaused && (
          <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">
            Envio pausado - Clique em "Retomar" para continuar
          </p>
        )}
        <Progress value={progress} />
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  contact.status === "sent"
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                    : contact.status === "sending"
                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                    : "bg-muted/50 border-border"
                }`}
              >
                {contact.status === "sent" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                ) : contact.status === "sending" ? (
                  <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{contact.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {contact.phone}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    contact.status === "sent"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : contact.status === "sending"
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {contact.status === "sent"
                    ? "Enviado"
                    : contact.status === "sending"
                    ? "Enviando..."
                    : "Aguardando"}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </CardGradient>
  );
};

export default ProgressSteps;
