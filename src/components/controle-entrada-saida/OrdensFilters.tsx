import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { StatusOrdemServico } from '@/types/fleet';

interface VeiculoOpt { id: string; placa_serie: string; tag_obra?: string | null }

export interface OrdensFiltersState {
  filtroStatus: StatusOrdemServico | 'all';
  filtroTipo: 'preventiva' | 'corretiva' | 'all';
  filtroVeiculo: string;
  veiculoSearch: string;
  dataInicio: string;
  dataFim: string;
}

interface Props {
  state: OrdensFiltersState;
  setState: {
    setFiltroStatus: (v: StatusOrdemServico | 'all') => void;
    setFiltroTipo: (v: 'preventiva' | 'corretiva' | 'all') => void;
    setFiltroVeiculo: (v: string) => void;
    setVeiculoSearch: (v: string) => void;
    setDataInicio: (v: string) => void;
    setDataFim: (v: string) => void;
  };
  veiculos: VeiculoOpt[] | undefined;
  onClear: () => void;
}

export function OrdensFilters({ state, setState, veiculos, onClear }: Props) {
  const { filtroStatus, filtroTipo, filtroVeiculo, veiculoSearch, dataInicio, dataFim } = state;

  const veiculosFiltrados = useMemo(() => {
    if (!veiculos) return [];
    const term = veiculoSearch.trim().toLowerCase();
    if (!term) return veiculos.slice(0, 100);
    return veiculos
      .filter((v) =>
        v.placa_serie?.toLowerCase().includes(term) ||
        v.tag_obra?.toLowerCase().includes(term),
      )
      .slice(0, 100);
  }, [veiculos, veiculoSearch]);

  const hasActiveFilters =
    filtroStatus !== 'all' ||
    filtroTipo !== 'all' ||
    filtroVeiculo !== 'all' ||
    !!dataInicio ||
    !!dataFim;

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="grid gap-1.5 min-w-[220px] flex-1">
        <Label className="text-xs">Veículo</Label>
        <div className="flex flex-col gap-1">
          <Input
            type="search"
            placeholder="Buscar placa ou tag..."
            value={veiculoSearch}
            onChange={(e) => setState.setVeiculoSearch(e.target.value)}
            className="h-9"
          />
          <select
            value={filtroVeiculo}
            onChange={(e) => setState.setFiltroVeiculo(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            translate="no"
          >
            <option value="all">Todos os veículos</option>
            {veiculosFiltrados.map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa_serie}{v.tag_obra ? ` - ${v.tag_obra}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Status</Label>
        <Select value={filtroStatus} onValueChange={(v) => setState.setFiltroStatus(v as StatusOrdemServico | 'all')}>
          <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Tipo</Label>
        <Select value={filtroTipo} onValueChange={(v) => setState.setFiltroTipo(v as 'preventiva' | 'corretiva' | 'all')}>
          <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="corretiva">Corretiva</SelectItem>
            <SelectItem value="preventiva">Preventiva</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Entrada de</Label>
        <Input type="date" value={dataInicio} onChange={(e) => setState.setDataInicio(e.target.value)} className="h-9 w-[160px]" />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">até</Label>
        <Input type="date" value={dataFim} onChange={(e) => setState.setDataFim(e.target.value)} className="h-9 w-[160px]" />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9 gap-1">
          <X className="h-4 w-4" /> Limpar
        </Button>
      )}
    </div>
  );
}
