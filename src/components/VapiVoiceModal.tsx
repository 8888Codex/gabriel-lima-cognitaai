import { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Phone, PhoneOff, Trash2, Download, Eye, EyeOff, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const VAPI_STORAGE_KEY = 'vapi_credentials';

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
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Carregar credenciais do localStorage
  useEffect(() => {
    const savedCredentials = localStorage.getItem(VAPI_STORAGE_KEY);
    if (savedCredentials) {
      try {
        const { publicKey: savedPublicKey, assistantId: savedAssistantId } = JSON.parse(savedCredentials);
        if (savedPublicKey && savedAssistantId) {
          setPublicKey(savedPublicKey);
          setAssistantId(savedAssistantId);
          setHasStoredCredentials(true);
          setIsEditingCredentials(false);
        }
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      }
    } else {
      setIsEditingCredentials(true);
    }
  }, []);

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
    
    // Salvar credenciais no localStorage
    try {
      localStorage.setItem(VAPI_STORAGE_KEY, JSON.stringify({
        publicKey,
        assistantId
      }));
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
    
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

  const clearCredentials = () => {
    localStorage.removeItem(VAPI_STORAGE_KEY);
    setPublicKey('');
    setAssistantId('');
    setHasStoredCredentials(false);
    setIsEditingCredentials(true);
    toast({
      title: 'Credenciais removidas',
      description: 'As credenciais salvas foram apagadas',
    });
  };

  const maskCredential = (value: string) => {
    if (!value || value.length < 8) return value;
    const start = value.substring(0, 4);
    const end = value.substring(value.length - 4);
    return `${start}${'•'.repeat(Math.min(value.length - 8, 20))}${end}`;
  };

  const downloadTranscript = (format: 'txt' | 'json') => {
    if (messages.length === 0) {
      toast({
        title: 'Sem transcrições',
        description: 'Não há mensagens para exportar',
        variant: 'destructive',
      });
      return;
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'txt') {
      content = messages
        .map((msg) => {
          const time = msg.timestamp.toLocaleString('pt-BR');
          const role = msg.role === 'user' ? 'Você' : 'Assistente';
          return `[${time}] ${role}: ${msg.transcript}`;
        })
        .join('\n\n');
      filename = `transcricao-vapi-${new Date().toISOString().slice(0, 10)}.txt`;
      mimeType = 'text/plain';
    } else {
      const exportData = {
        exportDate: new Date().toISOString(),
        callDuration: formatDuration(callDuration),
        messages: messages.map((msg) => ({
          role: msg.role,
          transcript: msg.transcript,
          timestamp: msg.timestamp.toISOString(),
        })),
      };
      content = JSON.stringify(exportData, null, 2);
      filename = `transcricao-vapi-${new Date().toISOString().slice(0, 10)}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Download iniciado',
      description: `Transcrição exportada em ${format.toUpperCase()}`,
    });
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
                {hasStoredCredentials && !isEditingCredentials ? (
                  // Modo visualização - credenciais mascaradas
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Vapi Public Key
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={maskCredential(publicKey)}
                          readOnly
                          className="flex-1 bg-muted"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Assistant ID
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={maskCredential(assistantId)}
                          readOnly
                          className="flex-1 bg-muted"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={startCall}
                        disabled={isConnecting}
                        className="flex-1"
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
                      
                      <Button
                        onClick={() => setIsEditingCredentials(true)}
                        variant="outline"
                        size="icon"
                        title="Editar credenciais"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        onClick={clearCredentials}
                        variant="outline"
                        size="icon"
                        title="Limpar credenciais salvas"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      ✓ Credenciais configuradas e seguras
                    </p>
                  </div>
                ) : (
                  // Modo edição - campos editáveis
                  <div className="space-y-4">
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

                    <div className="flex gap-2">
                      <Button
                        onClick={startCall}
                        disabled={isConnecting || !publicKey.trim() || !assistantId.trim()}
                        className="flex-1"
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
                      
                      {hasStoredCredentials && (
                        <Button
                          onClick={() => {
                            // Recarregar credenciais originais
                            const savedCredentials = localStorage.getItem(VAPI_STORAGE_KEY);
                            if (savedCredentials) {
                              const { publicKey: savedPublicKey, assistantId: savedAssistantId } = JSON.parse(savedCredentials);
                              setPublicKey(savedPublicKey);
                              setAssistantId(savedAssistantId);
                            }
                            setIsEditingCredentials(false);
                          }}
                          variant="outline"
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                    
                    {hasStoredCredentials && (
                      <p className="text-xs text-muted-foreground text-center">
                        Editando credenciais salvas
                      </p>
                    )}
                  </div>
                )}
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

                <div className="flex flex-col gap-3">
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

                  {messages.length > 0 && !isCallActive && (
                    <div className="flex justify-center gap-2">
                      <Button
                        onClick={() => downloadTranscript('txt')}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Baixar TXT
                      </Button>
                      <Button
                        onClick={() => downloadTranscript('json')}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Baixar JSON
                      </Button>
                    </div>
                  )}
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
