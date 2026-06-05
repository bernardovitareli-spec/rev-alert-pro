import { useState, useMemo, useEffect } from 'react';
import { useVeiculosComRevisoes } from '@/hooks/useFleetData';
import { VehicleCard } from './VehicleCard';
import { VehicleFilters } from './VehicleFilters';
import { FilterOptions, InsightFilter, VeiculoComRevisoes } from '@/types/fleet';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { useSearchParams } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

const INSIGHT_LABELS: Record<string, string> = {
  km_desatualizado: 'KM/Hora Desatualizado (sem atualização há +30 dias)',
  retorno_atrasado: 'Retorno ao Pátio Atrasado',
  entregas_atrasadas: 'Entregas Atrasadas',
};

export function VehiclesList() {
  const { data: veiculos, isLoading } = useVeiculosComRevisoes();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const insightParam = searchParams.get('insight') as InsightFilter;

  const [filters, setFilters] = useState<FilterOptions>(() => ({
    search: '',
    status: (searchParams.get('status') as any) || 'all',
    statusExecucao: (searchParams.get('statusExecucao') as any) || 'all',
    empresaId: 'all',
    tipoRevisaoId: 'all',
    periodo: 'all',
    insightFilter: insightParam || null,
  }));

  const diasLimite = 30;

  const filteredVehicles = useMemo(() => {
    if (!veiculos) return [];

    const hoje = new Date();
    const result = veiculos.flatMap((veiculo: VeiculoComRevisoes) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesPlaca = veiculo.placa_serie.toLowerCase().includes(searchLower);
        const matchesTag = veiculo.tag_obra?.toLowerCase().includes(searchLower);
        if (!matchesPlaca && !matchesTag) return [];
      }

      // Empresa filter
      if (filters.empresaId !== 'all' && veiculo.empresa_id !== filters.empresaId) {
        return [];
      }

      // Scope revisões when a tipo de revisão is selected, so cards reflect
      // ONLY the chosen revision type (status, counts, etc).
      let scoped: VeiculoComRevisoes = veiculo;
      if (filters.tipoRevisaoId !== 'all') {
        const revisoesFiltradas = veiculo.revisoes.filter(
          r => r.tipo_revisao_id === filters.tipoRevisaoId,
        );
        if (revisoesFiltradas.length === 0) return [];

        const revisoesCriticas = revisoesFiltradas.filter(r => r.status === 'critical').length;
        const revisoesAtencao = revisoesFiltradas.filter(r => r.status === 'warning').length;
        const revisoesOk = revisoesFiltradas.filter(r => r.status === 'ok').length;
        const statusGeral = revisoesCriticas > 0
          ? 'critical'
          : revisoesAtencao > 0
            ? 'warning'
            : 'ok';

        scoped = {
          ...veiculo,
          revisoes: revisoesFiltradas,
          revisoesCriticas,
          revisoesAtencao,
          revisoesOk,
          statusGeral,
        };
      }

      // Status filter (applied to scoped status)
      if (filters.status !== 'all' && scoped.statusGeral !== filters.status) {
        return [];
      }

      // Status execução filter (applied to scoped revisions)
      if (filters.statusExecucao !== 'all') {
        const hasStatusExecucao = scoped.revisoes.some(
          r => r.status_execucao === filters.statusExecucao,
        );
        if (!hasStatusExecucao) return [];
      }

      // Insight filters
      if (filters.insightFilter === 'km_desatualizado') {
        if (!scoped.ultima_atualizacao) return [scoped];
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - diasLimite);
        if (parseISO(scoped.ultima_atualizacao) >= dataLimite) return [];
      }

      if (filters.insightFilter === 'retorno_atrasado') {
        if (!scoped.retorno_patio) return [];
        if (parseISO(scoped.retorno_patio) >= hoje) return [];
      }

      if (filters.insightFilter === 'entregas_atrasadas') {
        const hasAtrasada = scoped.revisoes.some(r => {
          if (r.status_execucao !== 'em_servico' || !r.previsao_entrega) return false;
          return parseISO(r.previsao_entrega) < hoje;
        });
        if (!hasAtrasada) return [];
      }

      return [scoped];
    });


    // Sort by days (most outdated first) for insight filters
    if (filters.insightFilter === 'km_desatualizado') {
      result.sort((a, b) => {
        const daysA = a.ultima_atualizacao ? differenceInDays(hoje, parseISO(a.ultima_atualizacao)) : 9999;
        const daysB = b.ultima_atualizacao ? differenceInDays(hoje, parseISO(b.ultima_atualizacao)) : 9999;
        return daysB - daysA;
      });
    } else if (filters.insightFilter === 'retorno_atrasado') {
      result.sort((a, b) => {
        const daysA = a.retorno_patio ? differenceInDays(hoje, parseISO(a.retorno_patio)) : 0;
        const daysB = b.retorno_patio ? differenceInDays(hoje, parseISO(b.retorno_patio)) : 0;
        return daysB - daysA;
      });
    }

    return result;
  }, [veiculos, filters]);

  const clearInsightFilter = () => {
    setFilters(prev => ({ ...prev, insightFilter: null }));
    searchParams.delete('insight');
    setSearchParams(searchParams);
  };

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / PAGE_SIZE));

  // Reset to first page whenever filter results change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredVehicles.length);
  const pageVehicles = filteredVehicles.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[200px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {filters.insightFilter && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-primary">
            Filtro ativo: {INSIGHT_LABELS[filters.insightFilter] || filters.insightFilter}
          </span>
          <button
            onClick={clearInsightFilter}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtro
          </button>
        </div>
      )}

      <VehicleFilters filters={filters} onFiltersChange={setFilters} />

      {filteredVehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg">Nenhum veículo encontrado</p>
            <p className="text-sm mt-1">Tente ajustar os filtros ou importe dados da planilha</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              Mostrando <span className="font-medium text-foreground">{startIndex + 1}-{endIndex}</span> de{' '}
              <span className="font-medium text-foreground">{filteredVehicles.length}</span>{' '}
              veículo{filteredVehicles.length !== 1 ? 's' : ''}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pageVehicles.map((veiculo) => (
              <VehicleCard
                key={veiculo.id}
                veiculo={veiculo}
                showDeliveryInfo={filters.statusExecucao === 'em_servico'}
                insightFilter={filters.insightFilter}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

