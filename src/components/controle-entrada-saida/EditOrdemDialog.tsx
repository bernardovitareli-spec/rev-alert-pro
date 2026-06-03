import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateOrdemServico } from '@/hooks/useOrdensServico';
import { useVeiculos } from '@/hooks/useFleetData';
import { OrdemServico, StatusOrdemServico, SubcategoriaCorretiva, TipoManutencao } from '@/types/fleet';
import { SUBCATEGORIAS } from './constants';

interface TipoRevisaoRow { id: string; nome: string }
interface VeiculoOpt { id: string; placa_serie: string; tag_obra?: string | null }

interface Props {
  ordem: OrdemServico;
  onSuccess: () => void;
}

const parseDate = (v?: string | null): Date | undefined => {
  if (!v) return undefined;
  return new Date(v.includes('T') ? v : `${v}T12:00:00`);
};

export function EditOrdemDialog({ ordem, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const update = useUpdateOrdemServico();
  const { data: veiculos } = useVeiculos();
  const { data: tiposRevisao } = useQuery({
    queryKey: ['tipos_revisao'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tipos_revisao').select('*').order('nome');
      if (error) throw error;
      return data as TipoRevisaoRow[];
    },
  });

  const [form, setForm] = useState({
    veiculo_id: ordem.veiculo_id || '',
    tipo_manutencao: (ordem.tipo_manutencao || '') as TipoManutencao | '',
    subcategoria_corretiva: (ordem.subcategoria_corretiva || '') as SubcategoriaCorretiva | '',
    detalhamento: ordem.detalhamento || '',
    tipo_revisao_id: ordem.tipo_revisao_id || '',
    data_entrada: parseDate(ordem.data_entrada) || new Date(),
    km_entrada: ordem.km_entrada?.toString() || '',
    horimetro_entrada: ordem.horimetro_entrada?.toString() || '',
    tem_avarias: ordem.tem_avarias || false,
    descricao_avarias: ordem.descricao_avarias || '',
    previsao_saida: parseDate(ordem.previsao_saida),
    status: (ordem.status || 'aberta') as StatusOrdemServico,
    data_saida: parseDate(ordem.data_saida),
    km_saida: ordem.km_saida?.toString() || '',
    horimetro_saida: ordem.horimetro_saida?.toString() || '',
    avarias_resolvidas: ordem.avarias_resolvidas ?? true,
    observacoes_saida: ordem.observacoes_saida || '',
  });

  const handleSubmit = async () => {
    try {
      await update.mutateAsync({
        id: ordem.id,
        veiculo_id: form.veiculo_id,
        tipo_manutencao: form.tipo_manutencao || null,
        subcategoria_corretiva: form.tipo_manutencao === 'corretiva' && form.subcategoria_corretiva ? form.subcategoria_corretiva : null,
        detalhamento: form.detalhamento || null,
        tipo_revisao_id: form.tipo_manutencao === 'preventiva' && form.tipo_revisao_id ? form.tipo_revisao_id : null,
        data_entrada: format(form.data_entrada, 'yyyy-MM-dd'),
        km_entrada: form.km_entrada ? Number(form.km_entrada) : null,
        horimetro_entrada: form.horimetro_entrada ? Number(form.horimetro_entrada) : null,
        tem_avarias: form.tem_avarias,
        descricao_avarias: form.tem_avarias ? form.descricao_avarias || null : null,
        previsao_saida: form.previsao_saida ? format(form.previsao_saida, 'yyyy-MM-dd') : null,
        status: form.status,
        data_saida: form.data_saida ? format(form.data_saida, 'yyyy-MM-dd') : null,
        km_saida: form.km_saida ? Number(form.km_saida) : null,
        horimetro_saida: form.horimetro_saida ? Number(form.horimetro_saida) : null,
        avarias_resolvidas: form.tem_avarias ? form.avarias_resolvidas : null,
        observacoes_saida: form.observacoes_saida || null,
      });
      toast.success('Ordem atualizada com sucesso!');
      setOpen(false);
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('Erro ao atualizar: ' + msg);
    }
  };

  // Per project memory: native <select> and <input type="date"> inside modals
  // to avoid fatal Radix portal crashes.
  const selectCls = "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1"><Pencil className="h-3 w-3" /> Editar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ordem — {ordem.veiculo?.placa_serie}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Veículo / Equipamento</Label>
            <select
              value={form.veiculo_id}
              onChange={(e) => setForm({ ...form, veiculo_id: e.target.value })}
              className={selectCls}
              translate="no"
            >
              <option value="">Selecione o veículo</option>
              {(veiculos as VeiculoOpt[] | undefined)?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa_serie} {v.tag_obra ? `- ${v.tag_obra}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Data de Entrada</Label>
              <Input
                type="date"
                value={format(form.data_entrada, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const d = e.target.value ? new Date(e.target.value + 'T12:00:00') : new Date();
                  setForm({ ...form, data_entrada: d });
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>KM de Entrada</Label>
              <Input type="number" value={form.km_entrada} onChange={(e) => setForm({ ...form, km_entrada: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Horímetro de Entrada</Label>
              <Input type="number" value={form.horimetro_entrada} onChange={(e) => setForm({ ...form, horimetro_entrada: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Tipo de Manutenção</Label>
              <select
                value={form.tipo_manutencao}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tipo_manutencao: e.target.value as TipoManutencao | '',
                    subcategoria_corretiva: '',
                    tipo_revisao_id: '',
                  })
                }
                className={selectCls}
                translate="no"
              >
                <option value="">Selecione</option>
                <option value="corretiva">Corretiva</option>
                <option value="preventiva">Preventiva</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as StatusOrdemServico })}
                className={selectCls}
                translate="no"
              >
                <option value="aberta">Aberta</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>
          </div>

          {form.tipo_manutencao === 'corretiva' && (
            <>
              <div className="grid gap-2">
                <Label>Subcategoria</Label>
                <select
                  value={form.subcategoria_corretiva}
                  onChange={(e) =>
                    setForm({ ...form, subcategoria_corretiva: e.target.value as SubcategoriaCorretiva | '' })
                  }
                  className={selectCls}
                  translate="no"
                >
                  <option value="">Selecione</option>
                  {SUBCATEGORIAS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Detalhamento</Label>
                <Textarea value={form.detalhamento} onChange={(e) => setForm({ ...form, detalhamento: e.target.value })} />
              </div>
            </>
          )}

          {form.tipo_manutencao === 'preventiva' && (
            <div className="grid gap-2">
              <Label>Tipo de Revisão</Label>
              <select
                value={form.tipo_revisao_id}
                onChange={(e) => setForm({ ...form, tipo_revisao_id: e.target.value })}
                className={selectCls}
                translate="no"
              >
                <option value="">Selecione</option>
                {tiposRevisao?.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Label>Tem Avarias?</Label>
            <Switch checked={form.tem_avarias} onCheckedChange={(v) => setForm({ ...form, tem_avarias: v })} />
            <span className="text-sm text-muted-foreground">{form.tem_avarias ? 'Sim' : 'Não'}</span>
          </div>
          {form.tem_avarias && (
            <div className="grid gap-2">
              <Label>Descrição das Avarias</Label>
              <Textarea value={form.descricao_avarias} onChange={(e) => setForm({ ...form, descricao_avarias: e.target.value })} />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Previsão de Saída</Label>
            <Input
              type="date"
              value={form.previsao_saida ? format(form.previsao_saida, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                const d = e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined;
                setForm({ ...form, previsao_saida: d });
              }}
            />
          </div>

          {form.status === 'concluida' && (
            <>
              <div className="border-t pt-4 mt-2">
                <Label className="text-base font-semibold">Dados de Saída</Label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label>Data de Saída</Label>
                  <Input
                    type="date"
                    value={form.data_saida ? format(form.data_saida, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const d = e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined;
                      setForm({ ...form, data_saida: d });
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>KM de Saída</Label>
                  <Input type="number" value={form.km_saida} onChange={(e) => setForm({ ...form, km_saida: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Horímetro de Saída</Label>
                  <Input type="number" value={form.horimetro_saida} onChange={(e) => setForm({ ...form, horimetro_saida: e.target.value })} />
                </div>
              </div>
              {form.tem_avarias && (
                <div className="flex items-center gap-3">
                  <Label>Avarias Resolvidas?</Label>
                  <Switch checked={form.avarias_resolvidas} onCheckedChange={(v) => setForm({ ...form, avarias_resolvidas: v })} />
                </div>
              )}
              <div className="grid gap-2">
                <Label>Observações Finais</Label>
                <Textarea value={form.observacoes_saida} onChange={(e) => setForm({ ...form, observacoes_saida: e.target.value })} />
              </div>
            </>
          )}

          <Button onClick={handleSubmit} disabled={update.isPending} className="w-full mt-2">
            {update.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
