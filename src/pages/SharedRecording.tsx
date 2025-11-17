import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSharedRecordings } from "@/hooks/useSharedRecordings";
import { AudioPlayer } from "@/components/AudioPlayer";
import { TranscriptViewer } from "@/components/TranscriptViewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Lock, AlertCircle, Download, Clock, Phone } from "lucide-react";
import codexLogo from "@/assets/codex-logo.png";

export default function SharedRecording() {
  const { token } = useParams<{ token: string }>();
  const { getShareByToken, logAccess } = useSharedRecordings();

  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState<any>(null);
  const [callLog, setCallLog] = useState<any>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordAttempts, setPasswordAttempts] = useState(0);

  useEffect(() => {
    if (token) {
      validateAndLoadShare();
    }
  }, [token]);

  const validateAndLoadShare = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get share by token
      const shareData = await getShareByToken(token!);
      
      if (!shareData) {
        setError("Link de compartilhamento não encontrado.");
        setLoading(false);
        return;
      }

      // Check if active
      if (!shareData.is_active) {
        setError("Este link foi desativado.");
        setLoading(false);
        return;
      }

      // Check if revoked
      if (shareData.revoked_at) {
        setError("Este link foi revogado.");
        setLoading(false);
        return;
      }

      // Check expiration
      const expiryDate = new Date(shareData.expires_at);
      if (expiryDate < new Date()) {
        setError("Este link expirou.");
        setLoading(false);
        return;
      }

      // Check max views
      if (shareData.max_views && shareData.view_count >= shareData.max_views) {
        setError("Este link atingiu o limite máximo de visualizações.");
        setLoading(false);
        return;
      }

      setShare(shareData);

      // If password required, show password input
      if (shareData.require_password && !password) {
        setRequiresPassword(true);
        setLoading(false);
        return;
      }

      // If we have password, validate it
      if (shareData.require_password && password) {
        // Simple comparison - in production, this should be hashed
        if (password !== shareData.password_hash) {
          setPasswordAttempts(prev => prev + 1);
          if (passwordAttempts >= 2) {
            setError("Muitas tentativas incorretas. Tente novamente mais tarde.");
            setLoading(false);
            return;
          }
          setPasswordError("Senha incorreta. Tente novamente.");
          setLoading(false);
          return;
        }
      }

      // Load call log data
      const { data: callLogData, error: callError } = await supabase
        .from('call_logs')
        .select('*')
        .eq('id', shareData.call_log_id)
        .single();

      if (callError) throw callError;
      setCallLog(callLogData);

      // Load transcript if available
      if (callLogData.transcript) {
        const { data: transcriptData } = await supabase
          .from('call_transcripts')
          .select('*')
          .eq('call_log_id', shareData.call_log_id)
          .single();
        
        setTranscript(transcriptData);
      }

      // Log access
      const accessData = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'direct',
      };
      
      await logAccess(shareData.id, accessData);

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading shared recording:', err);
      setError("Erro ao carregar gravação compartilhada.");
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    validateAndLoadShare();
  };

  const handleDownload = () => {
    if (callLog?.recording_url) {
      window.open(callLog.recording_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <img src={codexLogo} alt="Codex" className="h-12" />
            </div>
            <CardTitle className="text-center">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requiresPassword && !callLog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <img src={codexLogo} alt="Codex" className="h-12" />
            </div>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              Gravação Protegida
            </CardTitle>
            <CardDescription className="text-center">
              Esta gravação requer uma senha para acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha"
                  required
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Acessar Gravação
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <img src={codexLogo} alt="Codex" className="h-10 mb-4" />
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Gravação de Chamada
                </CardTitle>
                <CardDescription>
                  {callLog?.customer_name && `Cliente: ${callLog.customer_name}`}
                  {callLog?.customer_phone && ` • ${callLog.customer_phone}`}
                </CardDescription>
              </div>
              {share?.allowDownload && callLog?.recording_url && (
                <Button onClick={handleDownload} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {callLog?.started_at && format(new Date(callLog.started_at), "PPp", { locale: ptBR })}
              </span>
              {callLog?.duration && (
                <span>
                  Duração: {Math.floor(callLog.duration / 60)}:{(callLog.duration % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Audio Player */}
        {callLog?.recording_url && (
          <Card>
            <CardHeader>
              <CardTitle>Gravação de Áudio</CardTitle>
            </CardHeader>
            <CardContent>
              <AudioPlayer 
                url={callLog.recording_url} 
                title={callLog.customer_name || "Chamada"}
                callLogId={callLog.id}
              />
            </CardContent>
          </Card>
        )}

        {/* Transcript */}
        {callLog?.transcript && (
          <Card>
            <CardHeader>
              <CardTitle>Transcrição</CardTitle>
            </CardHeader>
            <CardContent>
              <TranscriptViewer
                callLogId={callLog.id}
                transcript={callLog.transcript}
                segments={transcript?.segments}
                isLoading={false}
              />
            </CardContent>
          </Card>
        )}

        {/* Analysis */}
        {callLog?.analysis_summary && (
          <Card>
            <CardHeader>
              <CardTitle>Análise da Chamada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {callLog.analysis_summary}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8">
          <p>Compartilhado via Codex Call Logs</p>
        </div>
      </div>
    </div>
  );
}
