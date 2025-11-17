import { useState } from "react";
import { OutboundCall } from "@/types/outbound";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, BarChart3, FileText, Database } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface OutboundCallHistoryProps {
  calls: OutboundCall[];
}

const OutboundCallHistory = ({ calls }: OutboundCallHistoryProps) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState<OutboundCall | null>(null);

  const filteredCalls = calls.filter((call) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "scheduled") return call.status === "scheduled";
    if (statusFilter === "ended") return call.status === "ended" && !call.error;
    if (statusFilter === "failed") return call.status === "ended" && call.error;
    return true;
  });

  const getStatusVariant = (status: string, hasError?: string) => {
    if (hasError) return "destructive";
    if (status === "ended") return "default";
    if (status === "in-progress") return "default";
    if (status === "scheduled") return "secondary";
    return "outline";
  };

  const getStatusLabel = (status: string, hasError?: string) => {
    if (hasError) return "Falhou";
    if (status === "ended") return "Concluído";
    if (status === "scheduled") return "Agendado";
    if (status === "queued") return "Na fila";
    if (status === "ringing") return "Chamando";
    if (status === "in-progress") return "Em andamento";
    return status;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const exportHistory = () => {
    const csvContent = [
      ["Contato", "Número", "Status", "Data/Hora", "Duração (s)", "Erro"].join(","),
      ...filteredCalls.map((call) =>
        [
          call.customer.name || "-",
          call.customer.number,
          getStatusLabel(call.status, call.error),
          call.startedAt
            ? format(new Date(call.startedAt), "dd/MM/yyyy HH:mm")
            : call.scheduledAt
            ? format(new Date(call.scheduledAt), "dd/MM/yyyy HH:mm")
            : "-",
          call.duration || "-",
          call.error || "-",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outbound-calls-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exportado com sucesso",
      description: "Histórico de chamadas exportado para CSV",
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Histórico de Chamadas</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Agendados</SelectItem>
                  <SelectItem value="ended">Concluídos</SelectItem>
                  <SelectItem value="failed">Falhados</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={exportHistory} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhuma chamada encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="font-medium">
                        {call.customer.name || "-"}
                      </TableCell>
                      <TableCell>{call.customer.number}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(call.status, call.error)}>
                          {getStatusLabel(call.status, call.error)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {call.startedAt
                          ? format(new Date(call.startedAt), "dd/MM/yyyy HH:mm")
                          : call.scheduledAt
                          ? `${format(new Date(call.scheduledAt), "dd/MM/yyyy HH:mm")}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {call.duration ? formatDuration(call.duration) : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCall(call)}
                        >
                          Ver detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Chamada</DialogTitle>
          </DialogHeader>

          {selectedCall && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contato</p>
                  <p className="font-medium">{selectedCall.customer.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Número</p>
                  <p className="font-medium">{selectedCall.customer.number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusVariant(selectedCall.status, selectedCall.error)}>
                    {getStatusLabel(selectedCall.status, selectedCall.error)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duração</p>
                  <p className="font-medium">
                    {selectedCall.duration ? formatDuration(selectedCall.duration) : "-"}
                  </p>
                </div>
              </div>

              {selectedCall.error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">Erro</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedCall.error}</p>
                </div>
              )}

              {selectedCall.analysis && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Análise da Chamada
                  </h3>

                  {selectedCall.analysis.summary && (
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm font-medium flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        Resumo
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCall.analysis.summary}
                      </p>
                    </div>
                  )}

                  {selectedCall.analysis.structuredData && (
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Database className="h-4 w-4" />
                        Dados Estruturados
                      </p>
                      <pre className="text-xs text-muted-foreground overflow-auto">
                        {JSON.stringify(selectedCall.analysis.structuredData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OutboundCallHistory;
