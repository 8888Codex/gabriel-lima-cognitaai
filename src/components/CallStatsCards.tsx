import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import { CallStats } from "@/hooks/useCallLogs";

interface CallStatsCardsProps {
  stats: CallStats;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
};

export const CallStatsCards = ({ stats }: CallStatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Chamadas</CardTitle>
          <Phone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCalls}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.successfulCalls} sucesso / {stats.failedCalls} falhas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.successRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.successfulCalls} de {stats.totalCalls} chamadas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatDuration(stats.averageDuration)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Por chamada
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Distribuição de Sentimento</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-green-600 border-green-600">
              😊 {stats.sentimentDistribution.positive}
            </Badge>
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              😐 {stats.sentimentDistribution.neutral}
            </Badge>
            <Badge variant="outline" className="text-red-600 border-red-600">
              😞 {stats.sentimentDistribution.negative}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
