import { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Phone, PhoneOff, Trash2, Download, Edit2, Palette, BarChart3, FileText, Database, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const VAPI_STORAGE_KEY = 'vapi_credentials';
const VAPI_THEME_KEY = 'vapi_theme';

type VapiTheme = 'blue' | 'purple' | 'green' | 'orange' | 'pink';

const THEME_PRESETS: Record<VapiTheme, {
  name: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  gradient: string;
}> = {
  blue: {
    name: 'Azul Oceano',
    primary: '217 100% 55%',
    primaryForeground: '0 0% 100%',
    accent: '191 100% 50%',
    accentForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(217 100% 55%), hsl(191 100% 50%))',
  },
  purple: {
    name: 'Roxo Místico',
    primary: '271 81% 56%',
    primaryForeground: '0 0% 100%',
    accent: '291 64% 42%',
    accentForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(271 81% 56%), hsl(291 64% 42%))',
  },
  green: {
    name: 'Verde Esmeralda',
    primary: '142 76% 36%',
    primaryForeground: '0 0% 100%',
    accent: '160 84% 39%',
    accentForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(142 76% 36%), hsl(160 84% 39%))',
  },
  orange: {
    name: 'Laranja Vibrante',
    primary: '24 95% 53%',
    primaryForeground: '0 0% 100%',
    accent: '38 92% 50%',
    accentForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(24 95% 53%), hsl(38 92% 50%))',
  },
  pink: {
    name: 'Rosa Flamingo',
    primary: '339 82% 56%',
    primaryForeground: '0 0% 100%',
    accent: '350 89% 60%',
    accentForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(339 82% 56%), hsl(350 89% 60%))',
  },
};

interface Message {
  role: 'user' | 'assistant';
  transcript: string;
  timestamp: Date;
}

interface CallAnalysis {
  summary?: string;
  structuredData?: Record<string, any>;
  successEvaluation?: string | number | boolean;
}

interface CallInfo {
  id: string;
  startedAt?: Date;
  endedAt?: Date;
  duration: number;
  analysis?: CallAnalysis;
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
  const [selectedTheme, setSelectedTheme] = useState<VapiTheme>('blue');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Carregar credenciais e tema do localStorage
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

    const savedTheme = localStorage.getItem(VAPI_THEME_KEY) as VapiTheme;
    if (savedTheme && THEME_PRESETS[savedTheme]) {
      setSelectedTheme(savedTheme);
      applyTheme(savedTheme);
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

  // Função para adicionar ou atualizar mensagens agrupando falas consecutivas
  const addOrUpdateMessage = (newMessage: Message) => {
    setMessages((prevMessages) => {
      if (prevMessages.length === 0) {
        return [newMessage];
      }
      
      const lastMessage = prevMessages[prevMessages.length - 1];
      const timeDifference = newMessage.timestamp.getTime() - lastMessage.timestamp.getTime();
      
      // Se for do mesmo role e menos de 3 segundos de diferença, agrupar
      if (lastMessage.role === newMessage.role && timeDifference < 3000) {
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          transcript: lastMessage.transcript + ' ' + newMessage.transcript,
          timestamp: newMessage.timestamp,
        };
        return updatedMessages;
      }
      
      // Caso contrário, adicionar nova mensagem
      return [...prevMessages, newMessage];
    });
  };

  // Função para buscar análise da chamada
  const fetchCallAnalysis = async (callId: string) => {
    setIsLoadingAnalysis(true);
    
    try {
      // Aguardar alguns segundos para a análise ser processada
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
        headers: {
          'Authorization': `Bearer ${publicKey}`,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch call analysis');
      }
      
      const callData = await response.json();
      
      // Atualizar callInfo com dados de análise
      setCallInfo(prev => prev ? {
        ...prev,
        endedAt: new Date(),
        analysis: callData.analysis
      } : null);
      
      // Mostrar toast de sucesso
      toast({
        title: 'Análise concluída',
        description: 'A análise da chamada foi processada com sucesso',
      });
      
    } catch (error) {
      console.error('Error fetching call analysis:', error);
      toast({
        title: 'Erro ao buscar análise',
        description: 'Não foi possível recuperar a análise da chamada',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

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
        
        setCallInfo({
          id: '', // ID será capturado via message event
          startedAt: new Date(),
          duration: 0,
        });
        
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);

        toast({
          title: 'Chamada iniciada',
          description: 'Você está conectado ao assistente',
        });
      });

      vapiInstance.on('call-end', async () => {
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

        // Buscar análise da chamada
        if (callInfo?.id) {
          await fetchCallAnalysis(callInfo.id);
        }
      });

      vapiInstance.on('speech-start', () => {
        setIsSpeaking(true);
      });

      vapiInstance.on('speech-end', () => {
        setIsSpeaking(false);
      });

      vapiInstance.on('message', (message: any) => {
        // Capturar call_id se disponível
        if (message.call?.id) {
          setCallInfo(prev => prev ? { ...prev, id: message.call.id } : {
            id: message.call.id,
            startedAt: new Date(),
            duration: 0,
          });
        }
        
        if (message.type === 'transcript' && message.transcript) {
          addOrUpdateMessage({
            role: message.role,
            transcript: message.transcript,
            timestamp: new Date(),
          });
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
      let textContent = `Transcrição da Conversa\n`;
      textContent += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
      
      if (callInfo?.duration) {
        textContent += `Duração: ${formatDuration(callInfo.duration)}\n`;
      }
      
      // Adicionar análise se disponível
      if (callInfo?.analysis) {
        textContent += `\n--- ANÁLISE DA CHAMADA ---\n\n`;
        
        if (callInfo.analysis.summary) {
          textContent += `Resumo:\n${callInfo.analysis.summary}\n\n`;
        }
        
        if (callInfo.analysis.structuredData) {
          textContent += `Dados Extraídos:\n`;
          Object.entries(callInfo.analysis.structuredData).forEach(([key, value]) => {
            textContent += `- ${key}: ${value}\n`;
          });
          textContent += `\n`;
        }
        
        if (callInfo.analysis.successEvaluation !== undefined) {
          textContent += `Avaliação de Sucesso: ${callInfo.analysis.successEvaluation}\n\n`;
        }
      }
      
      textContent += `\n--- TRANSCRIÇÃO ---\n\n`;
      
      textContent += messages
        .map((msg) => {
          const time = msg.timestamp.toLocaleString('pt-BR');
          const role = msg.role === 'user' ? 'Você' : 'Assistente';
          return `[${time}] ${role}: ${msg.transcript}`;
        })
        .join('\n\n');
        
      content = textContent;
      filename = `transcricao-vapi-${new Date().toISOString().slice(0, 10)}.txt`;
      mimeType = 'text/plain';
    } else {
      const exportData = {
        exportDate: new Date().toISOString(),
        callDuration: formatDuration(callDuration),
        callInfo: callInfo ? {
          id: callInfo.id,
          duration: callInfo.duration,
          startedAt: callInfo.startedAt,
          endedAt: callInfo.endedAt,
          analysis: callInfo.analysis
        } : null,
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

  const applyTheme = (theme: VapiTheme) => {
    const preset = THEME_PRESETS[theme];
    const root = document.documentElement;
    
    root.style.setProperty('--vapi-primary', preset.primary);
    root.style.setProperty('--vapi-primary-foreground', preset.primaryForeground);
    root.style.setProperty('--vapi-accent', preset.accent);
    root.style.setProperty('--vapi-accent-foreground', preset.accentForeground);
    root.style.setProperty('--vapi-gradient', preset.gradient);
  };

  const handleThemeChange = (theme: VapiTheme) => {
    setSelectedTheme(theme);
    applyTheme(theme);
    localStorage.setItem(VAPI_THEME_KEY, theme);
    setShowThemeSelector(false);
    
    toast({
      title: 'Tema atualizado',
      description: `Tema "${THEME_PRESETS[theme].name}" aplicado com sucesso`,
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
            <div className="flex items-center gap-2">
              {isCallActive && (
                <span className="text-sm font-normal text-muted-foreground">
                  {formatDuration(callDuration)}
                </span>
              )}
              <Button
                onClick={() => setShowThemeSelector(!showThemeSelector)}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Alterar tema de cores"
              >
                <Palette className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
          
          {showThemeSelector && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3 animate-fade-in">
              <p className="text-sm font-medium text-foreground">Escolha um tema de cores:</p>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(THEME_PRESETS) as VapiTheme[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => handleThemeChange(theme)}
                    className={`relative group flex flex-col items-center gap-2 p-3 rounded-lg transition-all hover:scale-105 ${
                      selectedTheme === theme
                        ? 'ring-2 ring-offset-2 ring-offset-background'
                        : 'hover:bg-muted'
                    }`}
                    style={{
                      background: THEME_PRESETS[theme].gradient,
                    }}
                    title={THEME_PRESETS[theme].name}
                  >
                    <div className="w-full h-12 rounded-md" />
                    {selectedTheme === theme && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-vapi-primary" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2">
                <p className="text-xs text-muted-foreground">
                  Tema atual: <span className="font-medium">{THEME_PRESETS[selectedTheme].name}</span>
                </p>
              </div>
            </div>
          )}
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
                        className="flex-1 bg-gradient-vapi hover:opacity-90"
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
                        className="flex-1 bg-gradient-vapi hover:opacity-90"
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
                              ? 'bg-gradient-vapi text-white'
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
                          ? 'bg-gradient-vapi text-white'
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

                  {/* Seção de Análise da Chamada */}
                  {!isCallActive && callInfo?.analysis && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Análise da Chamada
                      </h3>
                      
                      {/* Resumo */}
                      {callInfo.analysis.summary && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Resumo:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {callInfo.analysis.summary}
                          </p>
                        </div>
                      )}
                      
                      {/* Dados Estruturados */}
                      {callInfo.analysis.structuredData && Object.keys(callInfo.analysis.structuredData).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            Dados Extraídos:
                          </p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {Object.entries(callInfo.analysis.structuredData).map(([key, value]) => (
                              <div key={key} className="flex justify-between gap-2">
                                <span className="font-medium">{key}:</span>
                                <span className="text-right">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Avaliação de Sucesso */}
                      {callInfo.analysis.successEvaluation !== undefined && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Avaliação de Sucesso:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {typeof callInfo.analysis.successEvaluation === 'boolean' 
                              ? (callInfo.analysis.successEvaluation ? '✅ Sucesso' : '❌ Falhou')
                              : callInfo.analysis.successEvaluation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Indicador de carregamento */}
                  {isLoadingAnalysis && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/50 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processando análise da chamada...</span>
                    </div>
                  )}

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
