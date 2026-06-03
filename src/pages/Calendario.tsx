import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, AlertCircle, CheckCircle, Search, X, Edit2, Wrench } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVeiculosComRevisoes, useEmpresas, useTiposRevisao } from '@/hooks/useFleetData';
import { RevisionStatus, ExecutionStatus } from '@/types/fleet';
import { RevisionEditModal, RevisionWithDetails } from '@/components/calendar/RevisionEditModal';
import { StatusExecucaoBadge } from '@/components/revisions/StatusExecucaoSelect';
import { cn } from '@/lib/utils';
import { getStatusLabel, formatarKmOuHora } from '@/lib/revisionCalculations';


interface DayRevisions {
  date: Date;
  revisoes: RevisionWithDetails[];
  hasCritical: boolean;
  hasWarning: boolean;
  hasOk: boolean;
}

export default function Calendario() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  
  // Filters
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<RevisionStatus | 'all'>('all');
  const [statusExecucaoFilter, setStatusExecucaoFilter] = useState<ExecutionStatus | 'all'>('all');
  const [empresaFilter, setEmpresaFilter] = useState<string>('all');
  const [tipoRevisaoFilter, setTipoRevisaoFilter] = useState<string>('all');
  
  // Modal state
  const [editingRevision, setEditingRevision] = useState<RevisionWithDetails | null>(null);

  const { data: veiculos, isLoading } = useVeiculosComRevisoes();
  const { data: empresas } = useEmpresas();
  const { data: tiposRevisao } = useTiposRevisao();

  // Check if any filters are active
  const hasActiveFilters = 
    searchFilter !== '' ||
    statusFilter !== 'all' ||
    statusExecucaoFilter !== 'all' ||
    empresaFilter !== 'all' ||
    tipoRevisaoFilter !== 'all';

  const clearFilters = () => {
    setSearchFilter('');
    setStatusFilter('all');
    setStatusExecucaoFilter('all');
    setEmpresaFilter('all');
    setTipoRevisaoFilter('all');
  };

  // Get all revisions with estimated dates
  const allRevisoes = useMemo(() => {
    if (!veiculos) return [];

    return veiculos.flatMap(veiculo => 
      veiculo.revisoes
        .filter(rev => {
          // Status filter
          if (statusFilter !== 'all' && rev.status !== statusFilter) return false;
          // Status execucao filter
          if (statusExecucaoFilter !== 'all' && rev.status_execucao !== statusExecucaoFilter) return false;
          // Empresa filter
          if (empresaFilter !== 'all' && veiculo.empresa_id !== empresaFilter) return false;
          // Tipo revisao filter
          if (tipoRevisaoFilter !== 'all' && rev.tipo_revisao_id !== tipoRevisaoFilter) return false;
          // Search filter
          if (searchFilter) {
            const searchLower = searchFilter.toLowerCase();
            const matchesPlaca = veiculo.placa_serie.toLowerCase().includes(searchLower);
            const matchesTag = veiculo.tag_obra?.toLowerCase().includes(searchLower);
            if (!matchesPlaca && !matchesTag) return false;
          }
          return true;
        })
        .map(rev => ({
          ...rev,
          veiculoPlaca: veiculo.placa_serie,
          veiculoTag: veiculo.tag_obra,
          veiculoId: veiculo.id,
          empresaNome: veiculo.empresa?.nome || null,
          estimatedDate: rev.diasEstimados !== null 
            ? new Date(Date.now() + rev.diasEstimados * 24 * 60 * 60 * 1000)
            : null,
        }))
    );
  }, [veiculos, statusFilter, statusExecucaoFilter, empresaFilter, tipoRevisaoFilter, searchFilter]);

  // Group revisions by day for the calendar
  const dayRevisionsMap = useMemo(() => {
    const map = new Map<string, DayRevisions>();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayRevisions = allRevisoes.filter(rev => {
        if (!(rev as any).estimatedDate) return false;
        return isSameDay((rev as any).estimatedDate, day);
      });

      // Also include critical revisions (past due) on today
      if (isToday(day)) {
        const criticalRevisions = allRevisoes.filter(rev => 
          rev.status === 'critical' && !dayRevisions.includes(rev)
        );
        dayRevisions.push(...criticalRevisions);
      }

      map.set(dayKey, {
        date: day,
        revisoes: dayRevisions,
        hasCritical: dayRevisions.some(r => r.status === 'critical'),
        hasWarning: dayRevisions.some(r => r.status === 'warning'),
        hasOk: dayRevisions.some(r => r.status === 'ok'),
      });
    });

    return map;
  }, [allRevisoes, currentMonth]);

  // Get revisions for selected day
  const selectedDayRevisions = useMemo(() => {
    if (!selectedDay) return [];
    const dayKey = format(selectedDay, 'yyyy-MM-dd');
    return dayRevisionsMap.get(dayKey)?.revisoes || [];
  }, [selectedDay, dayRevisionsMap]);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDay(new Date());
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the start of the month with empty cells
  const startDayOfWeek = monthStart.getDay();
  const paddedDays = [...Array(startDayOfWeek).fill(null), ...calendarDays];

  const getStatusIcon = (status: RevisionStatus) => {
    switch (status) {
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'ok': return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadgeClass = (status: RevisionStatus) => {
    switch (status) {
      case 'critical': return 'bg-status-critical text-white';
      case 'warning': return 'bg-status-warning text-black';
      case 'ok': return 'bg-status-ok text-white';
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calendário de Revisões</h1>
            <p className="text-muted-foreground">Visualize e edite as revisões programadas por data</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa ou tag..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RevisionStatus | 'all')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="critical">Vencidas</SelectItem>
                  <SelectItem value="warning">Atenção</SelectItem>
                  <SelectItem value="ok">Em Dia</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Execução */}
              <Select value={statusExecucaoFilter} onValueChange={(v) => setStatusExecucaoFilter(v as ExecutionStatus | 'all')}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Execução" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Todas Execuções</SelectItem>
                  <SelectItem value="nao_realizada">Não Realizada</SelectItem>
                  <SelectItem value="em_servico">Em Serviço</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                </SelectContent>
              </Select>

              {/* Empresa */}
              <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Todas as Empresas</SelectItem>
                  {empresas?.map(empresa => (
                    <SelectItem key={empresa.id} value={empresa.id}>{empresa.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tipo Revisão */}
              <Select value={tipoRevisaoFilter} onValueChange={setTipoRevisaoFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tipo de Revisão" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  {tiposRevisao?.map(tipo => (
                    <SelectItem key={tipo.id} value={tipo.id}>{tipo.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar filtros" aria-label="Limpar filtros">
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToday}>
                    Hoje
                  </Button>
                </div>
                <CardTitle className="text-xl">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {paddedDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const dayKey = format(day, 'yyyy-MM-dd');
                  const dayData = dayRevisionsMap.get(dayKey);
                  const hasRevisions = dayData && dayData.revisoes.length > 0;
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={dayKey}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        'aspect-square p-1 rounded-lg border transition-all hover:bg-accent flex flex-col items-center justify-start',
                        isSelected && 'ring-2 ring-primary',
                        isTodayDate && 'bg-accent font-bold',
                        !hasRevisions && 'opacity-60'
                      )}
                    >
                      <span className="text-sm">{format(day, 'd')}</span>
                      {hasRevisions && (
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                          {dayData.hasCritical && (
                            <div className="w-2 h-2 rounded-full bg-status-critical" />
                          )}
                          {dayData.hasWarning && (
                            <div className="w-2 h-2 rounded-full bg-status-warning" />
                          )}
                          {dayData.hasOk && (
                            <div className="w-2 h-2 rounded-full bg-status-ok" />
                          )}
                        </div>
                      )}
                      {hasRevisions && (
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {dayData.revisoes.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-4 pt-4 border-t justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-status-critical" />
                  <span className="text-sm text-muted-foreground">Vencidas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-status-warning" />
                  <span className="text-sm text-muted-foreground">Atenção</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-status-ok" />
                  <span className="text-sm text-muted-foreground">Em dia</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {selectedDay 
                  ? format(selectedDay, "d 'de' MMMM", { locale: ptBR })
                  : 'Selecione um dia'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDay ? (
                <p className="text-muted-foreground text-center py-8">
                  Clique em um dia no calendário para ver as revisões
                </p>
              ) : selectedDayRevisions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma revisão para este dia
                </p>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {selectedDayRevisions.map((rev, index) => (
                      <button
                        key={`${rev.id}-${index}`}
                        onClick={() => setEditingRevision(rev)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer group',
                          rev.status === 'critical' && 'border-status-critical bg-status-critical/10 hover:bg-status-critical/20',
                          rev.status === 'warning' && 'border-status-warning bg-status-warning/10 hover:bg-status-warning/20',
                          rev.status === 'ok' && 'border-status-ok bg-status-ok/10 hover:bg-status-ok/20'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate">{rev.veiculoPlaca}</p>
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {rev.veiculoTag && (
                              <p className="text-sm text-muted-foreground truncate">{rev.veiculoTag}</p>
                            )}
                            <p className="text-sm mt-1">{rev.tipo_revisao?.nome || 'Revisão'}</p>
                          </div>
                          <Badge className={getStatusBadgeClass(rev.status)}>
                            {getStatusIcon(rev.status)}
                            <span className="ml-1">{getStatusLabel(rev.status)}</span>
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            <p>Faltam: {formatarKmOuHora(rev.faltam, rev.unidade)}</p>
                          </div>
                          <StatusExecucaoBadge status={rev.status_execucao} />
                        </div>
                        {rev.status_execucao === 'em_servico' && rev.oficina && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Wrench className="h-3 w-3 shrink-0" />
                            <span className="font-medium">{rev.oficina.nome}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revision Edit Modal */}
      <RevisionEditModal
        open={!!editingRevision}
        onOpenChange={(open) => !open && setEditingRevision(null)}
        revision={editingRevision}
      />
    </AppLayout>
  );
}
