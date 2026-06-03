import { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOrdensServicoPaginated } from '@/hooks/useOrdensServico';
import { useVeiculos } from '@/hooks/useFleetData';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusOrdemServico } from '@/types/fleet';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { NovaEntradaDialog } from '@/components/controle-entrada-saida/NovaEntradaDialog';
import { OrdensFilters } from '@/components/controle-entrada-saida/OrdensFilters';
import { OrdensTable } from '@/components/controle-entrada-saida/OrdensTable';
import { PAGE_SIZE } from '@/components/controle-entrada-saida/constants';

export default function ControleEntradaSaida() {
  const { data: isAdmin } = useIsAdmin();
  const { data: veiculos } = useVeiculos();

  const [filtroStatus, setFiltroStatus] = useState<StatusOrdemServico | 'all'>('all');
  const [filtroTipo, setFiltroTipo] = useState<'preventiva' | 'corretiva' | 'all'>('all');
  const [filtroVeiculo, setFiltroVeiculo] = useState<string>('all');
  const [veiculoSearch, setVeiculoSearch] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      veiculoId: filtroVeiculo,
      status: filtroStatus,
      tipo: filtroTipo,
      dataInicio: dataInicio || null,
      dataFim: dataFim || null,
    }),
    [filtroVeiculo, filtroStatus, filtroTipo, dataInicio, dataFim],
  );

  useEffect(() => { setPage(1); }, [filters]);

  const { data: pageData, isLoading, isFetching, refetch } = useOrdensServicoPaginated(page, PAGE_SIZE, filters);
  const ordens = pageData?.rows ?? [];
  const total = pageData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);

  const clearAll = () => {
    setFiltroStatus('all');
    setFiltroTipo('all');
    setFiltroVeiculo('all');
    setVeiculoSearch('');
    setDataInicio('');
    setDataFim('');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6" /> Controle de Entrada / Saída
            </h1>
            <p className="text-muted-foreground">Registre a entrada e saída de equipamentos na oficina</p>
          </div>
          <NovaEntradaDialog onSuccess={() => refetch()} />
        </div>

        <OrdensFilters
          state={{ filtroStatus, filtroTipo, filtroVeiculo, veiculoSearch, dataInicio, dataFim }}
          setState={{
            setFiltroStatus, setFiltroTipo, setFiltroVeiculo,
            setVeiculoSearch, setDataInicio, setDataFim,
          }}
          veiculos={veiculos}
          onClear={clearAll}
        />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            {total === 0 ? 'Nenhuma ordem encontrada' : (
              <>
                Mostrando <span className="font-medium text-foreground">{startIndex}-{endIndex}</span> de{' '}
                <span className="font-medium text-foreground">{total}</span> ordens
                {isFetching && <span className="ml-2 text-xs italic">(atualizando...)</span>}
              </>
            )}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isFetching}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || isFetching}>
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : (
          <OrdensTable ordens={ordens} isAdmin={!!isAdmin} onChanged={() => refetch()} />
        )}
      </div>
    </AppLayout>
  );
}
