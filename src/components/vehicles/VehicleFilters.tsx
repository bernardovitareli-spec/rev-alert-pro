import { useEmpresas, useTiposRevisao } from '@/hooks/useFleetData';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterOptions } from '@/types/fleet';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VehicleFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export function VehicleFilters({ filters, onFiltersChange }: VehicleFiltersProps) {
  const { data: empresas } = useEmpresas();
  const { data: tiposRevisao } = useTiposRevisao();

  const updateFilter = <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      statusExecucao: 'all',
      empresaId: 'all',
      tipoRevisaoId: 'all',
      periodo: 'all',
    });
  };

  const hasActiveFilters = 
    filters.search !== '' || 
    filters.status !== 'all' || 
    filters.statusExecucao !== 'all' ||
    filters.empresaId !== 'all' || 
    filters.tipoRevisaoId !== 'all' ||
    filters.periodo !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa ou tag..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status filter */}
        <Select value={filters.status} onValueChange={(v) => updateFilter('status', v as any)}>
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

        {/* Status Execução filter */}
        <Select value={filters.statusExecucao} onValueChange={(v) => updateFilter('statusExecucao', v as any)}>
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

        {/* Period filter */}
        <Select value={filters.periodo} onValueChange={(v) => updateFilter('periodo', v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="amanha">Amanhã</SelectItem>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="proxima_semana">Próxima semana</SelectItem>
            <SelectItem value="mes">Este mês</SelectItem>
            <SelectItem value="proximo_mes">Próximo mês</SelectItem>
          </SelectContent>
        </Select>

        {/* Empresa filter */}
        <Select value={filters.empresaId} onValueChange={(v) => updateFilter('empresaId', v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {empresas?.map((empresa) => (
              <SelectItem key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tipo revisao filter */}
        <Select value={filters.tipoRevisaoId} onValueChange={(v) => updateFilter('tipoRevisaoId', v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo de Revisão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {tiposRevisao?.map((tipo) => (
              <SelectItem key={tipo.id} value={tipo.id}>
                {tipo.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} aria-label="Limpar filtros">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
