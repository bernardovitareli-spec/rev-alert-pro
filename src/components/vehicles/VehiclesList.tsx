import { useState, useMemo } from 'react';
import { useVeiculosComRevisoes } from '@/hooks/useFleetData';
import { VehicleCard } from './VehicleCard';
import { VehicleFilters } from './VehicleFilters';
import { FilterOptions, VeiculoComRevisoes } from '@/types/fleet';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useSearchParams } from 'react-router-dom';

export function VehiclesList() {
  const { data: veiculos, isLoading } = useVeiculosComRevisoes();
  const [searchParams] = useSearchParams();
  
  const [filters, setFilters] = useState<FilterOptions>(() => ({
    search: '',
    status: (searchParams.get('status') as any) || 'all',
    statusExecucao: (searchParams.get('statusExecucao') as any) || 'all',
    empresaId: 'all',
    tipoRevisaoId: 'all',
    periodo: 'all',
  }));

  const filteredVehicles = useMemo(() => {
    if (!veiculos) return [];

    return veiculos.filter((veiculo: VeiculoComRevisoes) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesPlaca = veiculo.placa_serie.toLowerCase().includes(searchLower);
        const matchesTag = veiculo.tag_obra?.toLowerCase().includes(searchLower);
        if (!matchesPlaca && !matchesTag) return false;
      }

      // Status filter
      if (filters.status !== 'all' && veiculo.statusGeral !== filters.status) {
        return false;
      }

      // Empresa filter
      if (filters.empresaId !== 'all' && veiculo.empresa_id !== filters.empresaId) {
        return false;
      }

      // Tipo revisao filter
      if (filters.tipoRevisaoId !== 'all') {
        const hasRevisionType = veiculo.revisoes.some(
          r => r.tipo_revisao_id === filters.tipoRevisaoId
        );
        if (!hasRevisionType) return false;
      }

      // Status execução filter
      if (filters.statusExecucao !== 'all') {
        const hasStatusExecucao = veiculo.revisoes.some(
          r => r.status_execucao === filters.statusExecucao
        );
        if (!hasStatusExecucao) return false;
      }

      return true;
    });
  }, [veiculos, filters]);

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
          <p className="text-sm text-muted-foreground">
            {filteredVehicles.length} veículo{filteredVehicles.length !== 1 ? 's' : ''} encontrado{filteredVehicles.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVehicles.map((veiculo) => (
              <VehicleCard 
                key={veiculo.id} 
                veiculo={veiculo} 
                showDeliveryInfo={filters.statusExecucao === 'em_servico'}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
