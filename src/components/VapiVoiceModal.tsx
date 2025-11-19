import { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCallLogs } from '@/hooks/useCallLogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Phone, PhoneOff, Trash2, Download, Edit2, Palette, BarChart3, FileText, Database, CheckCircle, Loader2, ChevronDown, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { OutboundCallConfig } from '@/types/outbound';

const VAPI_STORAGE_KEY = 'vapi_credentials';
const VAPI_THEME_KEY = 'vapi_theme';
const WEBHOOK_CONFIG_KEY = 'webhook_config';

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

type SuccessEvaluationRubric = 'NumericScale' | 'DescriptiveScale' | 'Checklist' | 'Matrix' | 'PercentageScale' | 'LikertScale' | 'AutomaticRubric' | 'PassFail';

interface AnalysisPlan {
  summaryPrompt?: string;
  structuredDataPrompt?: string;
  structuredDataSchema?: Record<string, any>;
  successEvaluationPrompt?: string;
  successEvaluationRubric?: SuccessEvaluationRubric;
}

interface VapiVoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Schema pré-configurado para análise de sentimento
const DEFAULT_SENTIMENT_SCHEMA = {
  type: "object",
  properties: {
    sentiment: { 
      type: "string", 
      enum: ["positive", "neutral", "negative"],
      description: "Sentimento geral da conversa"
    },
    customerSatisfaction: { 
      type: "string",
      enum: ["very_satisfied", "satisfied", "neutral", "dissatisfied", "very_dissatisfied"],
      description: "Nível de satisfação do cliente"
    },
    emotionalTone: {
      type: "array",
      items: { type: "string" },
      description: "Tons emocionais detectados (ex: frustrated, happy, confused, calm)"
    },
    keyTopics: {
      type: "array",
      items: { type: "string" },
      description: "Principais tópicos discutidos"
    },
    urgencyLevel: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Nível de urgência da questão"
    },
    followUpRequired: {
      type: "boolean",
      description: "Se é necessário follow-up"
    },
    nextSteps: {
      type: "string",
      description: "Próximos passos recomendados"
    }
  },
  required: ["sentiment", "customerSatisfaction", "followUpRequired"]
};

const VapiVoiceModal = ({ open, onOpenChange }: VapiVoiceModalProps) => {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [publicKey, setPublicKey] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    publicKey: boolean;
    assistantId: boolean;
  }>({
    publicKey: false,
    assistantId: false,
  });
  const [selectedTheme, setSelectedTheme] = useState<VapiTheme>('blue');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookHeaders, setWebhookHeaders] = useState('{}');
  
  // Outbound call states
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isOutboundCalling, setIsOutboundCalling] = useState(false);
  const [outboundCallId, setOutboundCallId] = useState<string | null>(null);
  const [outboundStatus, setOutboundStatus] = useState<string>('');
  const outboundPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [useTestEndpoint, setUseTestEndpoint] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  
  // Estados para Analysis Plan
  const [summaryPrompt, setSummaryPrompt] = useState('');
  const [structuredDataPrompt, setStructuredDataPrompt] = useState('');
  const [structuredDataSchema, setStructuredDataSchema] = useState('');
  const [successEvaluationPrompt, setSuccessEvaluationPrompt] = useState('');
  const [successEvaluationRubric, setSuccessEvaluationRubric] = useState<SuccessEvaluationRubric>('NumericScale');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { saveCallLog, updateCallLog } = useCallLogs();

  // Carregar credenciais e tema do localStorage
  useEffect(() => {
    const savedCredentials = localStorage.getItem(VAPI_STORAGE_KEY);
    if (savedCredentials) {
      try {
        const parsed = JSON.parse(savedCredentials);
        const { publicKey: savedPublicKey, assistantId: savedAssistantId, phoneNumberId: savedPhoneNumberId, analysisPlan } = parsed;
        if (savedPublicKey && savedAssistantId) {
          setPublicKey(savedPublicKey);
          setAssistantId(savedAssistantId);
          setPhoneNumberId(savedPhoneNumberId || '');
          setHasStoredCredentials(true);
          setIsEditingCredentials(false);
          
          // Carregar analysisPlan se existir
          if (analysisPlan) {
            setSummaryPrompt(analysisPlan.summaryPrompt || '');
            setStructuredDataPrompt(analysisPlan.structuredDataPrompt || '');
            setStructuredDataSchema(analysisPlan.structuredDataSchema ? JSON.stringify(analysisPlan.structuredDataSchema, null, 2) : '');
            setSuccessEvaluationPrompt(analysisPlan.successEvaluationPrompt || '');
            setSuccessEvaluationRubric(analysisPlan.successEvaluationRubric || 'NumericScale');
          }
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

    const storedWebhook = localStorage.getItem(WEBHOOK_CONFIG_KEY);
    if (storedWebhook) {
      try {
        const config = JSON.parse(storedWebhook);
        setWebhookUrl(config.url || '');
        setWebhookHeaders(config.headers ? JSON.stringify(config.headers, null, 2) : '{}');
        setWebhookStatus(config.status || 'unknown');
      } catch (error) {
        console.error('Error loading webhook config:', error);
      }
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
      
      // Se for do mesmo role e menos de 3 segundos de diferença, SUBSTITUIR (não concatenar)
      // porque o Vapi envia transcripts acumulativos
      if (lastMessage.role === newMessage.role && timeDifference < 3000) {
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          transcript: newMessage.transcript, // SUBSTITUIR, não concatenar!
          timestamp: newMessage.timestamp,
        };
        return updatedMessages;
      }
      
      // Caso contrário, adicionar nova mensagem
      return [...prevMessages, newMessage];
    });
  };

  // Função para buscar análise da chamada
  const fetchCallAnalysis = async (callId: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 10000; // 10 segundos entre tentativas
    
    setIsLoadingAnalysis(true);
    
    try {
      // Aguardar 8 segundos para a análise começar a processar
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      console.log(`[Call Analysis] Buscando análise para call ID: ${callId} (tentativa ${retryCount + 1})`);
      
      const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
        headers: {
          'Authorization': `Bearer ${publicKey}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const callData = await response.json();
      console.log('[Call Analysis] Dados recebidos:', callData);
      console.log('[Call Analysis] Análise:', callData.analysis);
      
      // Verificar se a análise existe e está completa
      if (!callData.analysis || Object.keys(callData.analysis).length === 0) {
        console.warn('[Call Analysis] Análise ainda não disponível ou vazia');
        
        // Retry se ainda houver tentativas
        if (retryCount < MAX_RETRIES) {
          console.log(`[Call Analysis] Tentando novamente em ${RETRY_DELAY/1000}s...`);
          setIsLoadingAnalysis(false);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return fetchCallAnalysis(callId, retryCount + 1);
        } else {
          throw new Error('Análise não disponível após múltiplas tentativas');
        }
      }
      
      // Atualizar callInfo com dados de análise
      setCallInfo(prev => prev ? {
        ...prev,
        endedAt: new Date(),
        analysis: callData.analysis
      } : null);
      
      toast({
        title: 'Análise concluída',
        description: 'A análise da chamada foi processada com sucesso',
      });
      
    } catch (error) {
      console.error('[Call Analysis] Erro:', error);
      toast({
        title: 'Erro ao buscar análise',
        description: error instanceof Error ? error.message : 'Não foi possível recuperar a análise da chamada',
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

        // Buscar análise e gravação da chamada
        if (callInfo?.id) {
          await fetchCallAnalysis(callInfo.id);
          
          // Buscar URL da gravação
          try {
            const response = await fetch(`https://api.vapi.ai/call/${callInfo.id}`, {
              headers: {
                'Authorization': `Bearer ${publicKey}`,
              }
            });
            
            if (response.ok) {
              const callData = await response.json();
              const recordingUrl = callData.recordingUrl || callData.artifact?.recordingUrl;
              
              // Atualizar chamada no banco de dados
              await updateCallLog(callInfo.id, {
                status: 'ended',
                endedAt: new Date(),
                duration: callDuration,
                analysis: callInfo.analysis,
                recordingUrl: recordingUrl,
              });
            }
          } catch (error) {
            console.error('[VapiVoiceModal] Error fetching recording URL:', error);
            // Still update the call without recording URL
            await updateCallLog(callInfo.id, {
              status: 'ended',
              endedAt: new Date(),
              duration: callDuration,
              analysis: callInfo.analysis,
            });
          }
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
          const callId = message.call.id;
          setCallInfo(prev => prev ? { ...prev, id: callId } : {
            id: callId,
            startedAt: new Date(),
            duration: 0,
          });
          
          // Salvar chamada no banco de dados
          saveCallLog({
            id: callId,
            status: 'in-progress',
            customer: { number: 'Inbound Call' },
            startedAt: new Date(),
          }).catch(err => console.error('[VapiVoiceModal] Error saving call:', err));
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

  const testWebhook = async () => {
    const effectiveUrl = useTestEndpoint 
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-test`
      : webhookUrl;

    if (!effectiveUrl) {
      toast({
        variant: "destructive",
        title: "URL do Webhook Obrigatória",
        description: "Por favor, insira a URL do webhook ou selecione o endpoint de teste.",
      });
      return;
    }

    setIsTestingWebhook(true);
    setWebhookStatus('unknown');

    try {
      const testPayload = {
        test: true,
        contact: {
          name: "Teste Sistema",
          phone: "+5511999999999",
          email: "teste@exemplo.com"
        },
        message: "Mensagem de teste do sistema",
        timestamp: new Date().toISOString()
      };

      console.log("🧪 Testando webhook:", effectiveUrl);
      console.log("📤 Payload de teste:", testPayload);

      // Parse custom headers if provided
      let customHeaders = {};
      try {
        if (webhookHeaders.trim()) {
          customHeaders = JSON.parse(webhookHeaders);
        }
      } catch (e) {
        console.warn("⚠️ Headers inválidos, usando headers padrão");
      }

      const startTime = Date.now();
      const response = await fetch(effectiveUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...customHeaders 
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000)
      });
      const latency = Date.now() - startTime;

      console.log("📥 Resposta:", response.status, response.statusText);
      console.log("⏱️ Latência:", latency, "ms");

      const responseText = await response.text();
      console.log("📄 Corpo da resposta:", responseText);

      if (response.ok) {
        setWebhookStatus('online');
        
        // Parse headers for storage
        let headersToStore = {};
        try {
          if (webhookHeaders.trim()) {
            headersToStore = JSON.parse(webhookHeaders);
          }
        } catch (e) {
          // Invalid JSON, save as empty object
        }
        
        const config = {
          url: webhookUrl,
          headers: headersToStore,
          lastTested: new Date().toISOString(),
          status: 'online',
          latency
        };
        localStorage.setItem(WEBHOOK_CONFIG_KEY, JSON.stringify(config));

        toast({
          title: "✅ Webhook Online",
          description: `Resposta recebida em ${latency}ms. Status: ${response.status}${useTestEndpoint ? ' (Endpoint de teste)' : ''}`,
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error("❌ Erro ao testar webhook:", error);
      setWebhookStatus('offline');
      
      const config = {
        url: webhookUrl,
        lastTested: new Date().toISOString(),
        status: 'offline',
        error: error.message
      };
      localStorage.setItem(WEBHOOK_CONFIG_KEY, JSON.stringify(config));

      toast({
        variant: "destructive",
        title: "❌ Webhook Offline",
        description: error.name === 'AbortError' 
          ? "Timeout: O webhook não respondeu em 10 segundos."
          : `Erro: ${error.message}`,
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const startCall = () => {
    // Se não tiver credenciais salvas ainda, salvar primeiro
    if (!hasStoredCredentials) {
      saveCredentials();
      // A função saveCredentials já valida e mostra toasts
      // Após salvar, o usuário pode clicar novamente para iniciar a chamada
      return;
    }

    setIsConnecting(true);
    
    // Construir analysisPlan se houver configurações
    const analysisPlan: AnalysisPlan = {};
    if (summaryPrompt.trim()) analysisPlan.summaryPrompt = summaryPrompt.trim();
    if (structuredDataPrompt.trim()) analysisPlan.structuredDataPrompt = structuredDataPrompt.trim();
    if (structuredDataSchema.trim()) {
      try {
        analysisPlan.structuredDataSchema = JSON.parse(structuredDataSchema);
      } catch (e) {
        toast({
          title: 'Erro no Schema JSON',
          description: 'O schema de dados estruturados não é um JSON válido',
          variant: 'destructive',
        });
        setIsConnecting(false);
        return;
      }
    }
    if (successEvaluationPrompt.trim()) analysisPlan.successEvaluationPrompt = successEvaluationPrompt.trim();
    if (successEvaluationRubric) analysisPlan.successEvaluationRubric = successEvaluationRubric;
    
    let vapiInstance = vapi;
    if (!vapiInstance) {
      vapiInstance = initializeVapi();
      if (!vapiInstance) {
        setIsConnecting(false);
        return;
      }
    }

    try {
      // Se houver analysisPlan configurado, enviar com assistantOverrides
      if (Object.keys(analysisPlan).length > 0) {
        vapiInstance.start(assistantId, {
          analysisPlan
        } as any);
      } else {
        vapiInstance.start(assistantId);
      }
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

  const saveCredentials = () => {
    // Validar campos obrigatórios
    const errors = {
      publicKey: !publicKey.trim(),
      assistantId: !assistantId.trim(),
    };
    
    setFieldErrors(errors);
    
    if (errors.publicKey || errors.assistantId) {
      toast({
        title: 'Campos obrigatórios vazios',
        description: 'Preencha Public Key e Assistant ID para continuar',
        variant: 'destructive',
      });
      return;
    }

    // Construir analysisPlan apenas com campos preenchidos
    const analysisPlan: AnalysisPlan = {};
    if (summaryPrompt.trim()) analysisPlan.summaryPrompt = summaryPrompt.trim();
    if (structuredDataPrompt.trim()) analysisPlan.structuredDataPrompt = structuredDataPrompt.trim();
    if (structuredDataSchema.trim()) {
      try {
        analysisPlan.structuredDataSchema = JSON.parse(structuredDataSchema);
      } catch (e) {
        toast({
          title: 'Erro no Schema JSON',
          description: 'O schema de dados estruturados não é um JSON válido',
          variant: 'destructive',
        });
        return;
      }
    }
    if (successEvaluationPrompt.trim()) analysisPlan.successEvaluationPrompt = successEvaluationPrompt.trim();
    if (successEvaluationRubric) analysisPlan.successEvaluationRubric = successEvaluationRubric;

    // Salvar credenciais e analysisPlan no localStorage
    try {
      localStorage.setItem(VAPI_STORAGE_KEY, JSON.stringify({
        publicKey,
        assistantId,
        phoneNumberId,
        analysisPlan: Object.keys(analysisPlan).length > 0 ? analysisPlan : undefined
      }));

      if (webhookUrl) {
        const config = {
          url: webhookUrl,
          lastTested: new Date().toISOString(),
          status: webhookStatus
        };
        localStorage.setItem(WEBHOOK_CONFIG_KEY, JSON.stringify(config));
      }

      setHasStoredCredentials(true);
      setIsEditingCredentials(false);
      
      // Avisar se Phone Number ID não foi configurado
      if (!phoneNumberId.trim()) {
        toast({
          title: 'Configurações salvas',
          description: 'Credenciais salvas. Nota: Phone Number ID não configurado - você não poderá fazer chamadas outbound.',
        });
      } else {
        toast({
          title: 'Configurações salvas',
          description: 'Todas as credenciais foram salvas com sucesso',
        });
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as credenciais',
        variant: 'destructive',
      });
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
    localStorage.removeItem(WEBHOOK_CONFIG_KEY);
    setPublicKey('');
    setAssistantId('');
    setPhoneNumberId('');
    setHasStoredCredentials(false);
    setIsEditingCredentials(false);
    
    // Limpar também as configurações do analysisPlan
    setSummaryPrompt('');
    setStructuredDataPrompt('');
    setStructuredDataSchema('');
    setSuccessEvaluationPrompt('');
    setSuccessEvaluationRubric('NumericScale');
    
    // Limpar webhook
    setWebhookUrl('');
    setWebhookHeaders('{}');
    setWebhookStatus('unknown');
    
    toast({
      title: 'Configurações removidas',
      description: 'Todas as credenciais foram apagadas',
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
    setPhoneNumber('');
    setIsOutboundCalling(false);
    setOutboundCallId(null);
    setOutboundStatus('');
    if (vapi) {
      vapi.stop();
    }
    if (outboundPollIntervalRef.current) {
      clearInterval(outboundPollIntervalRef.current);
      outboundPollIntervalRef.current = null;
    }
  };

  const makeOutboundCall = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Erro",
        description: "Digite um número de telefone válido",
        variant: "destructive",
      });
      return;
    }

    if (!publicKey || !assistantId || !phoneNumberId) {
      toast({
        title: "Credenciais incompletas",
        description: "Configure suas credenciais Vapi primeiro",
        variant: "destructive",
      });
      setShowConfig(true);
      setActiveTab('inbound');
      return;
    }

    setIsOutboundCalling(true);
    setOutboundStatus('Iniciando ligação...');

    try {
      const config: OutboundCallConfig = {
        assistantId,
        phoneNumberId,
        customer: {
          number: phoneNumber,
        },
      };

      const response = await fetch("https://api.vapi.ai/call", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao iniciar ligação");
      }

      const callData = await response.json();
      setOutboundCallId(callData.id);
      setOutboundStatus('Chamando...');

      // Save to call logs
      await saveCallLog({
        id: callData.id,
        status: 'queued',
        customer: {
          number: phoneNumber,
        },
      });

      toast({
        title: "Ligação iniciada",
        description: `Chamando ${phoneNumber}...`,
      });

      // Start polling for status
      monitorOutboundCall(callData.id);
    } catch (error) {
      console.error('Error making outbound call:', error);
      setIsOutboundCalling(false);
      setOutboundStatus('');
      toast({
        title: "Erro ao fazer ligação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const monitorOutboundCall = async (callId: string) => {
    if (outboundPollIntervalRef.current) {
      clearInterval(outboundPollIntervalRef.current);
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
          headers: {
            Authorization: `Bearer ${publicKey}`,
          },
        });

        if (!response.ok) {
          throw new Error("Falha ao obter status da ligação");
        }

        const callData = await response.json();
        
        // Update UI status
        const statusMap: Record<string, string> = {
          queued: 'Na fila...',
          ringing: 'Chamando...',
          'in-progress': 'Em andamento',
          forwarding: 'Encaminhando...',
          ended: 'Finalizada',
        };
        
        setOutboundStatus(statusMap[callData.status] || callData.status);

        // Update call log
        await updateCallLog(callData.id, {
          status: callData.status,
          startedAt: callData.startedAt ? new Date(callData.startedAt) : undefined,
          endedAt: callData.endedAt ? new Date(callData.endedAt) : undefined,
          duration: callData.duration,
          analysis: callData.analysis,
          recordingUrl: callData.recordingUrl,
        });

        // Stop polling if call ended
        if (callData.status === 'ended') {
          setIsOutboundCalling(false);
          if (outboundPollIntervalRef.current) {
            clearInterval(outboundPollIntervalRef.current);
            outboundPollIntervalRef.current = null;
          }
          
          toast({
            title: "Ligação finalizada",
            description: callData.duration 
              ? `Duração: ${Math.floor(callData.duration / 60)}min ${callData.duration % 60}s`
              : undefined,
          });
        }
      } catch (error) {
        console.error('Error monitoring call:', error);
      }
    };

    // Initial poll
    await pollStatus();

    // Poll every 3 seconds
    outboundPollIntervalRef.current = setInterval(pollStatus, 3000);
  };

  const cancelOutboundCall = () => {
    setIsOutboundCalling(false);
    setOutboundCallId(null);
    setOutboundStatus('');
    if (outboundPollIntervalRef.current) {
      clearInterval(outboundPollIntervalRef.current);
      outboundPollIntervalRef.current = null;
    }
  };

  // Helper functions para visualização de sentimento
  const getSentimentEmoji = (sentiment: string) => {
    const map: Record<string, string> = {
      'positive': '😊',
      'neutral': '😐',
      'negative': '😞',
      'very_satisfied': '🤩',
      'satisfied': '😊',
      'dissatisfied': '😕',
      'very_dissatisfied': '😡'
    };
    return map[sentiment.toLowerCase()] || '';
  };

  const getSentimentColor = (sentiment: string) => {
    const map: Record<string, string> = {
      'positive': 'text-green-600',
      'neutral': 'text-yellow-600',
      'negative': 'text-red-600',
      'very_satisfied': 'text-green-600',
      'satisfied': 'text-green-500',
      'dissatisfied': 'text-orange-600',
      'very_dissatisfied': 'text-red-600'
    };
    return map[sentiment.toLowerCase()] || 'text-muted-foreground';
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
            <span>Chamadas de Voz Vapi</span>
            <div className="flex items-center gap-2">
              {hasStoredCredentials && (
                <Badge variant={phoneNumberId ? "default" : "secondary"} className="text-xs">
                  {phoneNumberId ? "✓ Outbound Pronto" : "⚠ Só Inbound"}
                </Badge>
              )}
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'inbound' | 'outbound')} className="flex-1 flex flex-col">
          <div className="px-6 pt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inbound">Chamada de Voz</TabsTrigger>
              <TabsTrigger value="outbound">Ligar para Número</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="inbound" className="flex-1 flex flex-col mt-0">
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

                    {phoneNumberId && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Phone Number ID (Outbound)
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            value={maskCredential(phoneNumberId)}
                            readOnly
                            className="flex-1 bg-muted"
                          />
                        </div>
                      </div>
                    )}

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
                    
                    <p className="text-xs text-success text-center flex items-center justify-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Credenciais configuradas
                    </p>
                    
                    {(summaryPrompt || structuredDataPrompt || structuredDataSchema || successEvaluationPrompt) && (
                      <div className="flex items-center justify-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg">
                        <Settings className="h-3 w-3 text-primary" />
                        <span className="text-xs text-primary font-medium">
                          Análise automática configurada
                        </span>
                      </div>
                    )}
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
                        onChange={(e) => {
                          setPublicKey(e.target.value);
                          setFieldErrors(prev => ({ ...prev, publicKey: false }));
                        }}
                        className={`w-full ${fieldErrors.publicKey ? "border-red-500" : ""}`}
                      />
                      {fieldErrors.publicKey && (
                        <p className="text-xs text-red-500">
                          Este campo é obrigatório
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Assistant ID
                      </label>
                      <Input
                        type="text"
                        placeholder="Digite o Assistant ID"
                        value={assistantId}
                        onChange={(e) => {
                          setAssistantId(e.target.value);
                          setFieldErrors(prev => ({ ...prev, assistantId: false }));
                        }}
                        className={`w-full ${fieldErrors.assistantId ? "border-red-500" : ""}`}
                      />
                      {fieldErrors.assistantId && (
                        <p className="text-xs text-red-500">
                          Este campo é obrigatório
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Phone Number ID
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Obrigatório para Outbound
                        </Badge>
                      </label>
                      <Input
                        type="text"
                        placeholder="Digite o Phone Number ID"
                        value={phoneNumberId}
                        onChange={(e) => setPhoneNumberId(e.target.value)}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Necessário apenas se você for fazer chamadas de saída (outbound calls)
                      </p>
                    </div>

                    {/* Webhook Configuration */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        URL do Webhook (Opcional)
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="url"
                          placeholder="https://seu-webhook.com/endpoint"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          className="flex-1"
                          disabled={useTestEndpoint}
                        />
                        <Button
                          onClick={testWebhook}
                          disabled={(!webhookUrl && !useTestEndpoint) || isTestingWebhook}
                          variant="outline"
                          size="icon"
                        >
                          {isTestingWebhook ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      {/* Test Endpoint Toggle */}
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox
                          id="use-test-endpoint"
                          checked={useTestEndpoint}
                          onCheckedChange={(checked) => setUseTestEndpoint(checked as boolean)}
                        />
                        <label
                          htmlFor="use-test-endpoint"
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Usar endpoint de teste interno (webhook-test)
                        </label>
                      </div>
                      
                      {webhookStatus !== 'unknown' && (
                        <div className={`flex items-center gap-1 text-xs ${
                          webhookStatus === 'online' ? 'text-green-600' : 'text-destructive'
                        }`}>
                          {webhookStatus === 'online' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          <span>{webhookStatus === 'online' ? 'Webhook Online' : 'Webhook Offline'}</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        URL para envio de dados das chamadas (integração com n8n, Make, etc)
                      </p>
                      
                      {/* Custom Headers */}
                      <div className="space-y-2 mt-3">
                        <label className="text-sm font-medium text-foreground">
                          Headers Personalizados (JSON)
                        </label>
                        <Textarea
                          placeholder='{"Authorization": "Bearer token", "X-Custom-Header": "value"}'
                          value={webhookHeaders}
                          onChange={(e) => setWebhookHeaders(e.target.value)}
                          className="font-mono text-xs min-h-[80px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          Headers opcionais para autenticação ou configuração do webhook (formato JSON)
                        </p>
                      </div>
                    </div>

                    {/* Botões de ação */}
                    {isEditingCredentials ? (
                      // Modo de edição: mostrar Salvar e Cancelar
                      <>
                        <div className="flex gap-2">
                          <Button
                            onClick={saveCredentials}
                            disabled={!publicKey.trim() || !assistantId.trim()}
                            className="flex-1 bg-primary hover:bg-primary/90"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Salvar Configurações
                          </Button>
                          
                          {hasStoredCredentials && (
                            <Button
                              onClick={() => {
                                // Recarregar credenciais originais e analysisPlan
                                const savedCredentials = localStorage.getItem(VAPI_STORAGE_KEY);
                                if (savedCredentials) {
                                  const parsed = JSON.parse(savedCredentials);
                                  setPublicKey(parsed.publicKey);
                                  setAssistantId(parsed.assistantId);
                                  setPhoneNumberId(parsed.phoneNumberId || '');
                                  
                                  // Recarregar analysisPlan
                                  if (parsed.analysisPlan) {
                                    setSummaryPrompt(parsed.analysisPlan.summaryPrompt || '');
                                    setStructuredDataPrompt(parsed.analysisPlan.structuredDataPrompt || '');
                                    setStructuredDataSchema(parsed.analysisPlan.structuredDataSchema ? JSON.stringify(parsed.analysisPlan.structuredDataSchema, null, 2) : '');
                                    setSuccessEvaluationPrompt(parsed.analysisPlan.successEvaluationPrompt || '');
                                    setSuccessEvaluationRubric(parsed.analysisPlan.successEvaluationRubric || 'NumericScale');
                                  } else {
                                    // Limpar campos se não houver analysisPlan salvo
                                    setSummaryPrompt('');
                                    setStructuredDataPrompt('');
                                    setStructuredDataSchema('');
                                    setSuccessEvaluationPrompt('');
                                    setSuccessEvaluationRubric('NumericScale');
                                  }
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
                      </>
                    ) : (
                      // Modo de visualização: mostrar Iniciar, Editar e Limpar
                      <>
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
                            <>
                              <Button
                                onClick={() => setIsEditingCredentials(true)}
                                variant="outline"
                                size="icon"
                                title="Editar configurações"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                onClick={clearCredentials}
                                variant="outline"
                                size="icon"
                                title="Limpar configurações"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                        
                        {hasStoredCredentials && (
                          <p className="text-xs text-success text-center flex items-center justify-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Credenciais configuradas
                          </p>
                        )}
                      </>
                    )}

                    {/* Configurações Avançadas - Analysis Plan */}
                    <Collapsible
                      open={showAdvancedConfig} 
                      onOpenChange={setShowAdvancedConfig}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            <span className="font-medium">Configurações de Análise (Opcional)</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedConfig ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="space-y-3 pt-2">
                        <p className="text-xs text-muted-foreground">
                          Configure como a chamada será analisada automaticamente ao final.
                        </p>
                        
                        {/* Summary Prompt */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Prompt de Resumo
                          </label>
                          <Textarea
                            placeholder="Ex: Resuma a ligação em 2-3 frases, destacando o motivo principal e o resultado."
                            value={summaryPrompt}
                            onChange={(e) => setSummaryPrompt(e.target.value)}
                            className="w-full min-h-[60px] text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Como o sistema deve criar o resumo da chamada
                          </p>
                        </div>

                        {/* Structured Data Prompt */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Prompt de Dados Estruturados
                          </label>
                          <Textarea
                            placeholder="Ex: Extraia os dados principais da conversa seguindo o schema definido."
                            value={structuredDataPrompt}
                            onChange={(e) => setStructuredDataPrompt(e.target.value)}
                            className="w-full min-h-[60px] text-sm"
                          />
                        </div>

                        {/* Structured Data Schema */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Schema de Dados (JSON)
                          </label>
                          <Textarea
                            placeholder={`{\n  "type": "object",\n  "properties": {\n    "customerName": { "type": "string" },\n    "issueResolved": { "type": "boolean" }\n  },\n  "required": ["issueResolved"]\n}`}
                            value={structuredDataSchema}
                            onChange={(e) => setStructuredDataSchema(e.target.value)}
                            className="w-full min-h-[120px] text-sm font-mono"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setStructuredDataSchema(JSON.stringify(DEFAULT_SENTIMENT_SCHEMA, null, 2))}
                            >
                              Usar Schema de Sentimento
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setStructuredDataSchema('')}
                            >
                              Limpar
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            JSON Schema para estruturar os dados extraídos
                          </p>
                        </div>

                        {/* Success Evaluation Prompt */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Prompt de Avaliação de Sucesso
                          </label>
                          <Textarea
                            placeholder="Ex: Avalie se a chamada foi bem-sucedida considerando: resolução do problema e satisfação do cliente."
                            value={successEvaluationPrompt}
                            onChange={(e) => setSuccessEvaluationPrompt(e.target.value)}
                            className="w-full min-h-[60px] text-sm"
                          />
                        </div>

                        {/* Success Evaluation Rubric */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Rubrica de Avaliação
                          </label>
                          <Select
                            value={successEvaluationRubric}
                            onValueChange={(value) => setSuccessEvaluationRubric(value as SuccessEvaluationRubric)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NumericScale">Escala Numérica (1-10)</SelectItem>
                              <SelectItem value="DescriptiveScale">Escala Descritiva</SelectItem>
                              <SelectItem value="Checklist">Lista de Verificação</SelectItem>
                              <SelectItem value="Matrix">Matriz de Critérios</SelectItem>
                              <SelectItem value="PercentageScale">Escala Percentual (0-100%)</SelectItem>
                              <SelectItem value="LikertScale">Escala Likert</SelectItem>
                              <SelectItem value="AutomaticRubric">Rubrica Automática</SelectItem>
                              <SelectItem value="PassFail">Passou/Falhou</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Como medir o sucesso da chamada
                          </p>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>⚠️ Importante sobre Call Analysis</AlertTitle>
                      <AlertDescription>
                        O <code className="text-xs bg-muted px-1 py-0.5 rounded">analysisPlan</code> configurado aqui é apenas uma <strong>referência local</strong>. 
                        Para que a análise funcione, você também precisa configurar o <strong>analysisPlan 
                        no seu Assistant</strong> via{' '}
                        <a href="https://dashboard.vapi.ai" target="_blank" rel="noopener noreferrer" className="underline">
                          Vapi Dashboard
                        </a> ou API.
                        <br/><br/>
                        💡 Dica: Use o botão "Usar Schema de Sentimento" para ter um schema pré-configurado.
                      </AlertDescription>
                    </Alert>
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
                      
                      {/* Dados Estruturados - Análise de Sentimento */}
                      {callInfo.analysis.structuredData && Object.keys(callInfo.analysis.structuredData).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            Análise de Sentimento:
                          </p>
                          <div className="text-sm space-y-2">
                            {Object.entries(callInfo.analysis.structuredData).map(([key, value]) => {
                              const isArray = Array.isArray(value);
                              const isSentiment = key.toLowerCase().includes('sentiment') || 
                                                key.toLowerCase().includes('satisfaction');
                              
                              return (
                                <div key={key} className="flex justify-between gap-2 p-2 bg-background rounded">
                                  <span className="font-medium capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                                  </span>
                                  <span className={`text-right ${isSentiment ? getSentimentColor(String(value)) : ''}`}>
                                    {isSentiment && getSentimentEmoji(String(value))} 
                                    {isArray ? (value as string[]).join(', ') : String(value)}
                                  </span>
                                </div>
                              );
                            })}
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
                      {callInfo?.id && (
                        <Button
                          onClick={() => fetchCallAnalysis(callInfo.id)}
                          variant="ghost"
                          size="sm"
                          disabled={isLoadingAnalysis}
                        >
                          {isLoadingAnalysis ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-3 w-3" />
                          )}
                          Buscar Análise
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
          </TabsContent>

          <TabsContent value="outbound" className="flex-1 flex flex-col mt-0 p-6">
            {!publicKey || !assistantId ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Credenciais básicas não configuradas</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Configure Public Key e Assistant ID na aba "Chamada de Voz".</p>
                  <Button 
                    onClick={() => setActiveTab('inbound')}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Ir para Configurações
                  </Button>
                </AlertDescription>
              </Alert>
            ) : !phoneNumberId ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Phone Number ID necessário</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Para fazer chamadas outbound, você precisa configurar o Phone Number ID.</p>
                  <p className="text-xs">Este é um ID específico do Vapi que identifica o número de telefone que será usado para originar as chamadas.</p>
                  <Button 
                    onClick={() => {
                      setActiveTab('inbound');
                      setIsEditingCredentials(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Configurar Phone Number ID
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex-1 flex flex-col gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Número de Telefone
                    </label>
                    <Input
                      type="tel"
                      placeholder="+5511999999999"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={isOutboundCalling}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Digite o número com código do país (ex: +55 11 99999-9999)
                    </p>
                  </div>

                  {outboundStatus && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        {isOutboundCalling && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        <span className="font-medium">{outboundStatus}</span>
                      </div>
                      {outboundCallId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {outboundCallId}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!isOutboundCalling ? (
                      <Button
                        onClick={makeOutboundCall}
                        className="flex-1"
                        size="lg"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Fazer Ligação
                      </Button>
                    ) : (
                      <Button
                        onClick={cancelOutboundCall}
                        variant="destructive"
                        className="flex-1"
                        size="lg"
                      >
                        <PhoneOff className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4 mt-auto">
                  <h3 className="font-semibold mb-2">Como funciona?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Digite o número de telefone com código do país</li>
                    <li>• Clique em "Fazer Ligação" para iniciar</li>
                    <li>• Acompanhe o status em tempo real</li>
                    <li>• O histórico será salvo automaticamente em Call Logs</li>
                  </ul>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default VapiVoiceModal;
