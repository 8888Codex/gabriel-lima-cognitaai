import { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  transcript: string;
  timestamp: Date;
}

interface VapiVoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VapiVoiceModal = ({ open, onOpenChange }: VapiVoiceModalProps) => {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [publicKey, setPublicKey] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (vapi) {
        vapi.stop();
      }
    };
  }, [vapi]);

  const initializeVapi = () => {
    if (!publicKey.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira a Public Key do Vapi',
        variant: 'destructive',
      });
      return;
    }

    if (!assistantId.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira o Assistant ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      const vapiInstance = new Vapi(publicKey);

      vapiInstance.on('call-start', () => {
        console.log('Call started');
        setIsCallActive(true);
        setIsConnecting(false);
        setShowConfig(false);
        
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);

        toast({
          title: 'Chamada iniciada',
          description: 'Você está conectado ao assistente',
        });
      });

      vapiInstance.on('call-end', () => {
        console.log('Call ended');
        setIsCallActive(false);
        setIsSpeaking(false);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        toast({
          title: 'Chamada encerrada',
          description: `Duração: ${formatDuration(callDuration)}`,
        });
      });

      vapiInstance.on('speech-start', () => {
        setIsSpeaking(true);
      });

      vapiInstance.on('speech-end', () => {
        setIsSpeaking(false);
      });

      vapiInstance.on('message', (message: any) => {
        if (message.type === 'transcript' && message.transcript) {
          setMessages((prev) => [
            ...prev,
            {
              role: message.role,
              transcript: message.transcript,
              timestamp: new Date(),
            },
          ]);
        }
      });

      vapiInstance.on('error', (error: any) => {
        console.error('Vapi error:', error);
        toast({
          title: 'Erro na chamada',
          description: error.message || 'Ocorreu um erro na comunicação',
          variant: 'destructive',
        });
        setIsConnecting(false);
      });

      setVapi(vapiInstance);
      return vapiInstance;
    } catch (error) {
      console.error('Error initializing Vapi:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível inicializar o Vapi',
        variant: 'destructive',
      });
      setIsConnecting(false);
      return null;
    }
  };

  const startCall = () => {
    setIsConnecting(true);
    
    let vapiInstance = vapi;
    if (!vapiInstance) {
      vapiInstance = initializeVapi();
      if (!vapiInstance) {
        setIsConnecting(false);
        return;
      }
    }

    try {
      vapiInstance.start(assistantId);
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a chamada',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    if (vapi) {
      vapi.stop();
      setCallDuration(0);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetModal = () => {
    setMessages([]);
    setCallDuration(0);
    setIsCallActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setShowConfig(true);
    if (vapi) {
      vapi.stop();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetModal();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[600px] h-[700px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>Assistente de Voz Vapi</span>
            {isCallActive && (
              <span className="text-sm font-normal text-muted-foreground">
                {formatDuration(callDuration)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {showConfig ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
              <div className="w-full max-w-md space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Vapi Public Key
                  </label>
                  <Input
                    type="text"
                    placeholder="Digite sua Public Key"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Assistant ID
                  </label>
                  <Input
                    type="text"
                    placeholder="Digite o Assistant ID"
                    value={assistantId}
                    onChange={(e) => setAssistantId(e.target.value)}
                    className="w-full"
                  />
                </div>

                <Button
                  onClick={startCall}
                  disabled={isConnecting || !publicKey.trim() || !assistantId.trim()}
                  className="w-full"
                  variant="gradient"
                >
                  {isConnecting ? (
                    <>Conectando...</>
                  ) : (
                    <>
                      <Phone className="mr-2 h-4 w-4" />
                      Iniciar Chamada
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p>Aguardando conversa...</p>
                      <p className="text-sm mt-2">Comece a falar com o assistente</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <p className="text-sm">{msg.transcript}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {msg.timestamp.toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="border-t p-6 space-y-4">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div
                      className={`absolute inset-0 rounded-full bg-primary/20 ${
                        isSpeaking ? 'animate-ping' : ''
                      }`}
                    />
                    <div
                      className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                        isSpeaking
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isSpeaking ? (
                        <Mic className="h-8 w-8" />
                      ) : (
                        <MicOff className="h-8 w-8" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <Button
                    onClick={endCall}
                    variant="destructive"
                    disabled={!isCallActive}
                    className="min-w-[140px]"
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    Encerrar
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VapiVoiceModal;
