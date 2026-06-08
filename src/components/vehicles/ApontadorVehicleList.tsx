import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2, Search, Save, Truck } from 'lucide-react';
import { format } from 'date-fns';

interface ApontadorVeiculo {
  id: string;
  placa_serie: string;
  tag_obra: string | null;
  km_atual: number | null;
  hora_atual: number | null;
  ultima_atualizacao: string | null;
  retorno_patio: string | null;
  empresa: { nome: string } | null;
}

export function ApontadorVehicleList() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: veiculos, isLoading, refetch } = useQuery({
    queryKey: ['apontador', 'veiculos'],
    queryFn: async (): Promise<ApontadorVeiculo[]> => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa_serie, tag_obra, km_atual, hora_atual, ultima_atualizacao, retorno_patio, empresa:empresas(nome)')
        .order('placa_serie');
      if (error) throw error;
      return (data ?? []) as unknown as ApontadorVeiculo[];
    },
  });

  const filtered = useMemo(() => {
    if (!veiculos) return [];
    const q = search.trim().toLowerCase();
    if (!q) return veiculos;
    return veiculos.filter(
      (v) =>
        v.placa_serie.toLowerCase().includes(q) ||
        v.tag_obra?.toLowerCase().includes(q),
    );
  }, [veiculos, search]);

  const selected = filtered.find((v) => v.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <Truck className="h-4 w-4 text-primary" />
        <span className="text-sm text-primary font-medium">
          Modo Apontador: atualize Km/Hr e retorno ao pátio dos veículos.
        </span>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por placa ou tag da obra"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum veículo encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={`text-left rounded-lg border p-4 transition-all hover:border-primary/60 ${
                selectedId === v.id ? 'border-primary bg-primary/5' : 'border-border/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{v.placa_serie}</span>
                <span className="text-xs text-muted-foreground">{v.empresa?.nome ?? '—'}</span>
              </div>
              {v.tag_obra && (
                <p className="text-xs text-muted-foreground mt-1">Obra: {v.tag_obra}</p>
              )}
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                <span>KM: {v.km_atual ?? 0}</span>
                <span>Hr: {v.hora_atual ?? 0}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ApontadorUpdateForm
          veiculo={selected}
          onSaved={async () => {
            await refetch();
          }}
        />
      )}
    </div>
  );
}

function ApontadorUpdateForm({
  veiculo,
  onSaved,
}: {
  veiculo: ApontadorVeiculo;
  onSaved: () => void | Promise<void>;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [km, setKm] = useState<string>(String(veiculo.km_atual ?? ''));
  const [hr, setHr] = useState<string>(String(veiculo.hora_atual ?? ''));
  const [dataAtualizacao, setDataAtualizacao] = useState<string>(
    veiculo.ultima_atualizacao ?? today,
  );
  const [retornoPatio, setRetornoPatio] = useState<string>(veiculo.retorno_patio ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('veiculos')
        .update({
          km_atual: km === '' ? null : Number(km),
          hora_atual: hr === '' ? null : Number(hr),
          ultima_atualizacao: dataAtualizacao || null,
          retorno_patio: retornoPatio || null,
        })
        .eq('id', veiculo.id);
      if (error) throw error;
      toast.success('Atualização salva');
      await onSaved();
    } catch (err) {
      toast.error('Falha ao salvar', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Atualizar {veiculo.placa_serie}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="km-atual">KM Atual</Label>
            <Input
              id="km-atual"
              type="number"
              inputMode="numeric"
              value={km}
              onChange={(e) => setKm(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hr-atual">Horímetro Atual</Label>
            <Input
              id="hr-atual"
              type="number"
              inputMode="numeric"
              value={hr}
              onChange={(e) => setHr(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="data-atualizacao">Última Atualização</Label>
            <input
              id="data-atualizacao"
              type="date"
              value={dataAtualizacao}
              onChange={(e) => setDataAtualizacao(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="retorno-patio">Retorno ao Pátio (opcional)</Label>
            <input
              id="retorno-patio"
              type="date"
              value={retornoPatio}
              onChange={(e) => setRetornoPatio(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="min-w-[180px]">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Salvar Atualização
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
