import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { CallStatsCards } from "@/components/CallStatsCards";
import { CallLogFilters } from "@/components/CallLogFilters";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useCallLogs, CallStats } from "@/hooks/useCallLogs";
import { Download, FileText, BarChart3, Database, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

const CallLogs = () => {
  const { getCallLogs, getCallStats, updateCallLog } = useCallLogs();
  
  const [calls, setCalls] = useState<any[]>([]);
  const [stats, setStats] = useState<CallStats>({
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    successRate: 0,
    averageDuration: 0,
    sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [loadingRecording, setLoadingRecording] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    loadData();
  }, [currentPage, searchTerm, statusFilter, sentimentFilter, periodFilter, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Determine date range based on period filter
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (periodFilter === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      } else if (periodFilter === '7days') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (periodFilter === '30days') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      } else if (periodFilter === 'custom') {
        startDate = dateRange.from;
        endDate = dateRange.to;
      }

      // Load calls
      const { calls: fetchedCalls, totalPages: pages } = await getCallLogs({
        page: currentPage,
        pageSize: 20,
        searchTerm: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sentiment: sentimentFilter !== 'all' ? sentimentFilter : undefined,
        startDate,
        endDate,
      });

      setCalls(fetchedCalls);
      setTotalPages(pages);

      // Load stats
      const fetchedStats = await getCallStats(
        periodFilter === 'all' ? 'all' : 
        periodFilter === 'today' ? 'today' : 
        periodFilter === '7days' ? '7days' : 
        periodFilter === '30days' ? '30days' : 'all'
      );
      setStats(fetchedStats);
    } catch (error) {
      console.error('Error loading call logs:', error);
      toast({
        title: 'Erro ao carregar logs',
        description: 'Não foi possível carregar o histórico de chamadas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSentimentFilter("all");
    setPeriodFilter("all");
    setDateRange({ from: undefined, to: undefined });
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Data/Hora", "Contato", "Telefone", "Status", "Duração (s)", "Sentimento", "Resumo", "Avaliação"].join(","),
      ...calls.map(call => [
        format(new Date(call.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        call.customer_name || "-",
        call.customer_phone,
        call.status,
        call.duration || 0,
        call.sentiment || "-",
        `"${call.analysis_summary || "-"}"`,
        `"${call.analysis_success_evaluation || "-"}"`,
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `call-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exportado com sucesso',
      description: `${calls.length} registros foram exportados`,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      ended: { label: '✅ Concluída', className: 'bg-green-500/10 text-green-600 border-green-600' },
      failed: { label: '❌ Falhada', className: 'bg-red-500/10 text-red-600 border-red-600' },
      'in-progress': { label: '📞 Em progresso', className: 'bg-blue-500/10 text-blue-600 border-blue-600' },
      scheduled: { label: '📅 Agendada', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-600' },
    };
    const config = variants[status] || { label: status, className: '' };
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const getSentimentEmoji = (sentiment: string | null) => {
    if (!sentiment) return '-';
    const map: Record<string, string> = {
      positive: '😊',
      neutral: '😐',
      negative: '😞',
    };
    return map[sentiment.toLowerCase()] || '-';
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch recording URL from Vapi API
  const fetchRecordingUrl = async (vapiCallId: string) => {
    setLoadingRecording(true);
    try {
      // Get Vapi credentials from localStorage
      const savedCredentials = localStorage.getItem('vapi_credentials');
      if (!savedCredentials) {
        toast({
          title: 'Credenciais não encontradas',
          description: 'Configure as credenciais Vapi para acessar gravações',
          variant: 'destructive',
        });
        return;
      }

      const { publicKey } = JSON.parse(savedCredentials);
      if (!publicKey) {
        toast({
          title: 'Credenciais inválidas',
          description: 'Public Key do Vapi não encontrada',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(`https://api.vapi.ai/call/${vapiCallId}`, {
        headers: {
          Authorization: `Bearer ${publicKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar dados da chamada');
      }

      const callData = await response.json();
      const recordingUrl = callData.recordingUrl || callData.artifact?.recordingUrl;

      if (recordingUrl) {
        // Update in database
        await updateCallLog(vapiCallId, { recordingUrl });
        
        // Update local state
        setSelectedCall((prev: any) => prev ? { ...prev, recording_url: recordingUrl } : null);
        setCalls((prev) =>
          prev.map((call) =>
            call.vapi_call_id === vapiCallId ? { ...call, recording_url: recordingUrl } : call
          )
        );

        toast({
          title: 'Gravação encontrada',
          description: 'A gravação está disponível para reprodução',
        });
      } else {
        toast({
          title: 'Gravação não disponível',
          description: 'Esta chamada não possui gravação disponível no momento',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching recording:', error);
      toast({
        title: 'Erro ao buscar gravação',
        description: 'Não foi possível carregar a gravação da chamada',
        variant: 'destructive',
      });
    } finally {
      setLoadingRecording(false);
    }
  };

  // Check for recording when modal opens
  useEffect(() => {
    if (selectedCall && !selectedCall.recording_url && selectedCall.vapi_call_id) {
      fetchRecordingUrl(selectedCall.vapi_call_id);
    }
  }, [selectedCall?.id]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Histórico de Chamadas</h1>
            <p className="text-muted-foreground">Visualize e analise todas as suas chamadas</p>
          </div>
          <Button onClick={exportToCSV} disabled={calls.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Statistics Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="mb-6">
            <CallStatsCards stats={stats} />
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <CallLogFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              sentimentFilter={sentimentFilter}
              onSentimentChange={setSentimentFilter}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              periodFilter={periodFilter}
              onPeriodChange={setPeriodFilter}
              onClearFilters={handleClearFilters}
            />
          </CardContent>
        </Card>

        {/* Call Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Registros de Chamadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : calls.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Nenhuma chamada encontrada</p>
                <p className="text-muted-foreground">Tente ajustar os filtros ou faça sua primeira chamada</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Sentimento</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calls.map((call) => (
                        <TableRow 
                          key={call.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedCall(call)}
                        >
                          <TableCell>
                            {format(new Date(call.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{call.customer_name || 'Sem nome'}</div>
                              <div className="text-sm text-muted-foreground">{call.customer_phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(call.status)}</TableCell>
                          <TableCell>{formatDuration(call.duration)}</TableCell>
                          <TableCell>
                            <span className="text-2xl">{getSentimentEmoji(call.sentiment)}</span>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCall(call);
                              }}
                            >
                              Ver detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          const page = i + 1;
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Call Details Dialog */}
      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Chamada</DialogTitle>
          </DialogHeader>
          
          {selectedCall && (
            <div className="space-y-4">
              {/* Audio Player */}
              {selectedCall.recording_url ? (
                <div>
                  <p className="text-sm font-medium mb-2">🎧 Gravação da Chamada:</p>
                  <AudioPlayer 
                    url={selectedCall.recording_url} 
                    title={`Chamada com ${selectedCall.customer_name || selectedCall.customer_phone}`}
                  />
                </div>
              ) : loadingRecording ? (
                <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">Buscando gravação...</p>
                </div>
              ) : (
                <div className="p-4 bg-muted rounded">
                  <p className="text-sm text-muted-foreground">
                    Gravação não disponível para esta chamada
                  </p>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contato</p>
                  <p className="font-medium">{selectedCall.customer_name || 'Sem nome'}</p>
                  <p className="text-sm text-muted-foreground">{selectedCall.customer_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedCall.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">
                    {format(new Date(selectedCall.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duração</p>
                  <p className="font-medium">{formatDuration(selectedCall.duration)}</p>
                </div>
              </div>

              {/* Analysis */}
              {selectedCall.analysis_summary && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1 mb-2">
                    <FileText className="h-3 w-3" />
                    Resumo da Análise:
                  </p>
                  <p className="text-sm bg-muted p-3 rounded">{selectedCall.analysis_summary}</p>
                </div>
              )}

              {/* Structured Data */}
              {selectedCall.analysis_structured_data && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1 mb-2">
                    <Database className="h-3 w-3" />
                    Análise de Sentimento:
                  </p>
                  <div className="space-y-2">
                    {Object.entries(selectedCall.analysis_structured_data).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-2 p-2 bg-muted rounded text-sm">
                        <span className="font-medium capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span>
                          {Array.isArray(value) ? (value as string[]).join(', ') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Evaluation */}
              {selectedCall.analysis_success_evaluation && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1 mb-2">
                    <BarChart3 className="h-3 w-3" />
                    Avaliação de Sucesso:
                  </p>
                  <p className="text-sm bg-muted p-3 rounded">{selectedCall.analysis_success_evaluation}</p>
                </div>
              )}

              {/* Error Message */}
              {selectedCall.error_message && (
                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded">
                  <p className="text-sm font-medium text-red-600 mb-1">Erro:</p>
                  <p className="text-sm text-red-600">{selectedCall.error_message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CallLogs;
