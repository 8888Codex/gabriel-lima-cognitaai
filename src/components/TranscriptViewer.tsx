import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, User, Headset, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

interface TranscriptViewerProps {
  callLogId: string;
  transcript?: string;
  segments?: TranscriptSegment[];
  isLoading?: boolean;
}

export const TranscriptViewer = ({ 
  callLogId, 
  transcript, 
  segments,
  isLoading = false 
}: TranscriptViewerProps) => {
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSpeakerIcon = (speaker: string) => {
    switch (speaker) {
      case 'agent':
        return <Headset className="h-4 w-4" />;
      case 'customer':
        return <User className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getSpeakerLabel = (speaker: string) => {
    switch (speaker) {
      case 'agent':
        return 'Atendente';
      case 'customer':
        return 'Cliente';
      default:
        return 'Desconhecido';
    }
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'agent':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'customer':
        return 'bg-secondary/10 text-secondary-foreground border-secondary/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const filteredSegments = segments?.filter(
    seg => !selectedSpeaker || seg.speaker === selectedSpeaker
  );

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Processando transcrição...</span>
        </div>
      </Card>
    );
  }

  if (!transcript && !segments) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground text-center">
          Transcrição não disponível
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Transcrição da Chamada</h3>
        
        {segments && (
          <div className="flex gap-2">
            <Button
              variant={selectedSpeaker === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSpeaker(null)}
            >
              Todos
            </Button>
            <Button
              variant={selectedSpeaker === 'agent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSpeaker('agent')}
            >
              <Headset className="h-3 w-3 mr-1" />
              Atendente
            </Button>
            <Button
              variant={selectedSpeaker === 'customer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSpeaker('customer')}
            >
              <User className="h-3 w-3 mr-1" />
              Cliente
            </Button>
          </div>
        )}
      </div>

      {segments && segments.length > 0 ? (
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {filteredSegments?.map((segment, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getSpeakerColor(segment.speaker)} animate-fade-in`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {getSpeakerIcon(segment.speaker)}
                  <span className="text-xs font-medium">
                    {getSpeakerLabel(segment.speaker)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{segment.text}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="h-96">
          <div className="prose prose-sm max-w-none">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {transcript}
            </p>
          </div>
        </ScrollArea>
      )}

      {segments && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <span>{segments.length} segmentos</span>
          <span>•</span>
          <span>
            {segments.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0)} palavras
          </span>
        </div>
      )}
    </Card>
  );
};
