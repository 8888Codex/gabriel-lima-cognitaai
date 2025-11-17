import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CallLogFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  sentimentFilter: string;
  onSentimentChange: (value: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  periodFilter: string;
  onPeriodChange: (value: string) => void;
  onClearFilters: () => void;
}

export const CallLogFilters = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sentimentFilter,
  onSentimentChange,
  dateRange,
  onDateRangeChange,
  periodFilter,
  onPeriodChange,
  onClearFilters,
}: CallLogFiltersProps) => {
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || sentimentFilter !== 'all' || periodFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Period Filter */}
        <Select value={periodFilter} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7days">Últimos 7 dias</SelectItem>
            <SelectItem value="30days">Últimos 30 dias</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Date Range */}
        {periodFilter === 'custom' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full md:w-[280px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                      {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecionar período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range: any) => onDateRangeChange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ended">✅ Concluída</SelectItem>
            <SelectItem value="failed">❌ Falhada</SelectItem>
            <SelectItem value="scheduled">📅 Agendada</SelectItem>
            <SelectItem value="in-progress">📞 Em progresso</SelectItem>
          </SelectContent>
        </Select>

        {/* Sentiment Filter */}
        <Select value={sentimentFilter} onValueChange={onSentimentChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Sentimento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="positive">😊 Positivo</SelectItem>
            <SelectItem value="neutral">😐 Neutro</SelectItem>
            <SelectItem value="negative">😞 Negativo</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={onClearFilters} title="Limpar filtros">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
