import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSharedRecordings, SharedRecording } from "@/hooks/useSharedRecordings";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Copy, Link2, Trash2, Eye, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callLogId: string;
}

export const ShareRecordingDialog = ({ open, onOpenChange, callLogId }: ShareRecordingDialogProps) => {
  const { toast } = useToast();
  const { createShare, listShares, revokeShare } = useSharedRecordings();
  
  const [shares, setShares] = useState<SharedRecording[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [expiresAt, setExpiresAt] = useState<Date>();
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [maxViews, setMaxViews] = useState<number>();
  const [allowDownload, setAllowDownload] = useState(false);
  const [allowedEmails, setAllowedEmails] = useState("");

  useEffect(() => {
    if (open) {
      loadShares();
      // Set default expiration to 7 days from now
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 7);
      setExpiresAt(defaultExpiry);
    }
  }, [open, callLogId]);

  const loadShares = async () => {
    const data = await listShares(callLogId);
    setShares(data);
  };

  const handleCreate = async () => {
    if (!expiresAt) {
      toast({
        title: "Data de expiração obrigatória",
        description: "Selecione quando o link deve expirar.",
        variant: "destructive",
      });
      return;
    }

    if (requirePassword && !password) {
      toast({
        title: "Senha obrigatória",
        description: "Digite uma senha para proteger o link.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const emailList = allowedEmails
      ? allowedEmails.split(',').map(e => e.trim()).filter(e => e)
      : undefined;

    const result = await createShare({
      callLogId,
      expiresAt,
      requirePassword,
      password: requirePassword ? password : undefined,
      maxViews: maxViews || undefined,
      allowDownload,
      allowedEmails: emailList,
    });

    if (result) {
      // Reset form
      setPassword("");
      setRequirePassword(false);
      setMaxViews(undefined);
      setAllowDownload(false);
      setAllowedEmails("");
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);
      setExpiresAt(newExpiry);
      
      await loadShares();
    }
    
    setLoading(false);
  };

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência.",
    });
  };

  const handleRevoke = async (shareId: string) => {
    const success = await revokeShare(shareId);
    if (success) {
      await loadShares();
    }
  };

  const getStatusBadge = (share: SharedRecording) => {
    const now = new Date();
    const expiryDate = new Date(share.expires_at);
    const isExpired = expiryDate < now;
    const maxViewsReached = share.max_views && share.view_count >= share.max_views;
    
    if (share.revoked_at) {
      return <Badge variant="secondary">Revogado</Badge>;
    }
    if (isExpired) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (maxViewsReached) {
      return <Badge variant="destructive">Limite atingido</Badge>;
    }
    if (share.is_active) {
      return <Badge className="bg-green-500">Ativo</Badge>;
    }
    return <Badge variant="secondary">Inativo</Badge>;
  };

  const formatTimeRemaining = (expires_at: string) => {
    const now = new Date();
    const expiry = new Date(expires_at);
    const diff = expiry.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `Expira em ${days}d ${hours}h`;
    if (hours > 0) return `Expira em ${hours}h`;
    return "Expira em breve";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar Gravação</DialogTitle>
          <DialogDescription>
            Crie links seguros para compartilhar esta gravação com pessoas externas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Share Form */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Criar Novo Compartilhamento</h3>
            
            <div className="grid gap-4">
              {/* Expiration Date */}
              <div className="space-y-2">
                <Label>Data de Expiração *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expiresAt && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiresAt ? format(expiresAt, "PPP", { locale: ptBR }) : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expiresAt}
                      onSelect={setExpiresAt}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Max Views */}
              <div className="space-y-2">
                <Label htmlFor="maxViews">Limite de Visualizações (opcional)</Label>
                <Input
                  id="maxViews"
                  type="number"
                  min="1"
                  value={maxViews || ""}
                  onChange={(e) => setMaxViews(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Sem limite"
                />
              </div>

              {/* Password Protection */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="requirePassword"
                  checked={requirePassword}
                  onCheckedChange={setRequirePassword}
                />
                <Label htmlFor="requirePassword">Proteger com senha</Label>
              </div>
              
              {requirePassword && (
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite uma senha"
                />
              )}

              {/* Allow Download */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="allowDownload"
                  checked={allowDownload}
                  onCheckedChange={setAllowDownload}
                />
                <Label htmlFor="allowDownload">Permitir download</Label>
              </div>

              {/* Allowed Emails */}
              <div className="space-y-2">
                <Label htmlFor="allowedEmails">Emails Permitidos (opcional)</Label>
                <Input
                  id="allowedEmails"
                  value={allowedEmails}
                  onChange={(e) => setAllowedEmails(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Separe múltiplos emails com vírgula
                </p>
              </div>
            </div>

            <Button onClick={handleCreate} disabled={loading} className="w-full">
              {loading ? "Criando..." : "Criar Link de Compartilhamento"}
            </Button>
          </div>

          <Separator />

          {/* Active Shares List */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Compartilhamentos Ativos</h3>
            
            {shares.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum compartilhamento criado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {shares.map((share) => (
                  <div key={share.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(share)}
                          {share.is_active && new Date(share.expires_at) > new Date() && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeRemaining(share.expires_at)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Eye className="h-3 w-3" />
                          <span>
                            {share.view_count} {share.max_views ? `/ ${share.max_views}` : ''} visualizações
                          </span>
                        </div>

                        {share.last_accessed_at && (
                          <p className="text-xs text-muted-foreground">
                            Último acesso: {format(new Date(share.last_accessed_at), "PPp", { locale: ptBR })}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(share.share_token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {share.is_active && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevoke(share.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs bg-muted p-2 rounded">
                      <Link2 className="h-3 w-3" />
                      <code className="flex-1 truncate">
                        {window.location.origin}/share/{share.share_token}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
