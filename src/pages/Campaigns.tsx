import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCampaigns, Campaign, QueueContact } from "@/hooks/useCampaigns";
import { CampaignImportDialog } from "@/components/CampaignImportDialog";
import { Plus, Play, Pause, X, Upload, Clock, Phone, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Campaigns = () => {
  const { toast } = useToast();
  const {
    isLoading,
    createCampaign,
    getCampaigns,
    startCampaign,
    pauseCampaign,
    cancelCampaign,
    addContactsToQueue,
    getQueueStats,
  } = useCampaigns();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [queueStats, setQueueStats] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    batch_size: 10,
    interval_minutes: 2,
    start_time: '09:00',
    end_time: '18:00',
    assistant_id: '',
    phone_number_id: '',
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    const data = await getCampaigns();
    setCampaigns(data);
  };

  const handleCreateCampaign = async () => {
    try {
      await createCampaign({
        name: formData.name,
        description: formData.description,
        batch_size: formData.batch_size,
        interval_minutes: formData.interval_minutes,
        start_time: formData.start_time,
        end_time: formData.end_time,
        status: 'draft',
      });

      setShowNewDialog(false);
      setFormData({
        name: '',
        description: '',
        batch_size: 10,
        interval_minutes: 2,
        start_time: '09:00',
        end_time: '18:00',
        assistant_id: '',
        phone_number_id: '',
      });

      loadCampaigns();
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
    }
  };

  const handleImportContacts = async (contacts: QueueContact[]) => {
    if (!selectedCampaign) return;

    try {
      // Adicionar assistant_id e phone_number_id aos contatos
      const contactsWithConfig = contacts.map(c => ({
        ...c,
        assistant_id: formData.assistant_id,
        phone_number_id: formData.phone_number_id,
      }));

      await addContactsToQueue(selectedCampaign.id, contactsWithConfig);
      loadCampaigns();
      
      // Atualizar stats
      const stats = await getQueueStats(selectedCampaign.id);
      setQueueStats(stats);
    } catch (error) {
      console.error('Erro ao importar contatos:', error);
    }
  };

  const handleStartCampaign = async (id: string) => {
    try {
      await startCampaign(id);
      loadCampaigns();
      toast({
        title: "Campanha iniciada!",
        description: "As chamadas serão disparadas automaticamente a cada 2 minutos.",
      });
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error);
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      await pauseCampaign(id);
      loadCampaigns();
    } catch (error) {
      console.error('Erro ao pausar campanha:', error);
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const variants = {
      draft: 'secondary',
      active: 'default',
      paused: 'outline',
      completed: 'secondary',
      cancelled: 'destructive',
    };

    const labels = {
      draft: 'Rascunho',
      active: 'Ativa',
      paused: 'Pausada',
      completed: 'Concluída',
      cancelled: 'Cancelada',
    };

    return (
      <Badge variant={variants[status] as any}>
        {labels[status]}
      </Badge>
    );
  };

  const calculateProgress = (campaign: Campaign) => {
    if (campaign.total_contacts === 0) return 0;
    return (campaign.completed_calls / campaign.total_contacts) * 100;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Campanhas de Disparo</h1>
            <p className="text-muted-foreground">
              Gerencie campanhas de chamadas automatizadas com disparo faseado
            </p>
          </div>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>

        {/* Lista de Campanhas */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{campaign.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {campaign.description || 'Sem descrição'}
                    </CardDescription>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progresso */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">
                      {campaign.completed_calls} / {campaign.total_contacts}
                    </span>
                  </div>
                  <Progress value={calculateProgress(campaign)} />
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{campaign.batch_size} por lote</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>A cada {campaign.interval_minutes}min</span>
                  </div>
                </div>

                {/* Horário de Operação */}
                {campaign.start_time && campaign.end_time && (
                  <div className="text-sm text-muted-foreground">
                    🕐 {campaign.start_time} às {campaign.end_time}
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  {campaign.status === 'draft' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowImportDialog(true);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Importar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleStartCampaign(campaign.id)}
                        disabled={campaign.total_contacts === 0}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Iniciar
                      </Button>
                    </>
                  )}

                  {campaign.status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePauseCampaign(campaign.id)}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </Button>
                  )}

                  {campaign.status === 'paused' && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleStartCampaign(campaign.id)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Retomar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => cancelCampaign(campaign.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {campaigns.length === 0 && !isLoading && (
          <Card className="py-12">
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Nenhuma campanha criada ainda
              </p>
              <Button onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Campanha
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog: Nova Campanha */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
            <DialogDescription>
              Configure uma nova campanha de disparo automatizado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Campanha</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Prospecção Q1 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o objetivo desta campanha..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch_size">Contatos por Lote</Label>
                <Input
                  id="batch_size"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.batch_size}
                  onChange={(e) => setFormData({ ...formData, batch_size: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval_minutes">Intervalo (minutos)</Label>
                <Input
                  id="interval_minutes"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.interval_minutes}
                  onChange={(e) => setFormData({ ...formData, interval_minutes: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Horário de Início</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">Horário de Término</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assistant_id">Assistant ID (Vapi)</Label>
              <Input
                id="assistant_id"
                value={formData.assistant_id}
                onChange={(e) => setFormData({ ...formData, assistant_id: e.target.value })}
                placeholder="assistant_xxxxx"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number_id">Phone Number ID (Vapi)</Label>
              <Input
                id="phone_number_id"
                value={formData.phone_number_id}
                onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })}
                placeholder="phone_xxxxx"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCampaign}
                disabled={!formData.name || !formData.assistant_id || !formData.phone_number_id}
              >
                Criar Campanha
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Importar Contatos */}
      <CampaignImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImportContacts}
      />
    </div>
  );
};

export default Campaigns;
