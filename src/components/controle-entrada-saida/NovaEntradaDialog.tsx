import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOrdemServico, useUploadAvariaFoto } from '@/hooks/useOrdensServico';
import { useVeiculos } from '@/hooks/useFleetData';
import { SubcategoriaCorretiva } from '@/types/fleet';
import { SUBCATEGORIAS } from './constants';

interface TipoRevisaoRow { id: string; nome: string; intervalo_padrao?: number | null; unidade_padrao?: string | null }
interface VeiculoOpt { id: string; placa_serie: string; tag_obra?: string | null }

interface Props {
  onSuccess: () => void;
}

export function NovaEntradaDialog({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const { data: veiculos } = useVeiculos();
  const { data: tiposRevisao } = useQuery({
    queryKey: ['tipos_revisao'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tipos_revisao').select('*').order('nome');
      if (error) throw error;
      return data as TipoRevisaoRow[];
    },
  });
  const createOS = useCreateOrdemServico();
  const uploadFoto = useUploadAvariaFoto();

  const [form, setForm] = useState({
    veiculo_id: '',
    tipo_manutencao: '' as 'preventiva' | 'corretiva' | '',
    subcategoria_corretiva: '' as SubcategoriaCorretiva | '',
    detalhamento: '',
    tipo_revisao_id: '',
    data_entrada: new Date(),
    km_entrada: '',
    horimetro_entrada: '',
    tem_avarias: false,
    descricao_avarias: '',
    previsao_saida: undefined as Date | undefined,
  });
  const [fotos, setFotos] = useState<File[]>([]);

  const resetForm = () => {
    setForm({
      veiculo_id: '', tipo_manutencao: '', subcategoria_corretiva: '', detalhamento: '',
      tipo_revisao_id: '', data_entrada: new Date(), km_entrada: '', horimetro_entrada: '',
      tem_avarias: false, descricao_avarias: '', previsao_saida: undefined,
    });
    setFotos([]);
  };

  const handleSubmit = async () => {
    if (!form.veiculo_id || !form.tipo_manutencao) {
      toast.error('Selecione o veículo e o tipo de manutenção');
      return;
    }

    try {
      const result = await createOS.mutateAsync({
        veiculo_id: form.veiculo_id,
        tipo_manutencao: form.tipo_manutencao,
        subcategoria_corretiva: form.tipo_manutencao === 'corretiva' && form.subcategoria_corretiva ? form.subcategoria_corretiva : null,
        detalhamento: form.detalhamento || null,
        tipo_revisao_id: form.tipo_manutencao === 'preventiva' && form.tipo_revisao_id ? form.tipo_revisao_id : null,
        data_entrada: format(form.data_entrada, 'yyyy-MM-dd'),
        km_entrada: form.km_entrada ? Number(form.km_entrada) : null,
        horimetro_entrada: form.horimetro_entrada ? Number(form.horimetro_entrada) : null,
        tem_avarias: form.tem_avarias,
        descricao_avarias: form.tem_avarias ? form.descricao_avarias || null : null,
        previsao_saida: form.previsao_saida ? format(form.previsao_saida, 'yyyy-MM-dd') : null,
      });

      if (form.tem_avarias && fotos.length > 0) {
        for (const file of fotos) {
          await uploadFoto.mutateAsync({ ordemServicoId: (result as { id: string }).id, file });
        }
      }

      toast.success('Entrada registrada com sucesso!');
      resetForm();
      onSuccess();
      setTimeout(() => setOpen(false), 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('Erro ao registrar entrada: ' + msg);
    }
  };

  const selectCls = "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Nova Entrada</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Entrada de Equipamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Veículo / Equipamento *</Label>
            <select
              value={form.veiculo_id}
              onChange={(e) => setForm((p) => ({ ...p, veiculo_id: e.target.value }))}
              className={selectCls}
              translate="no"
            >
              <option value="">Selecione o veículo</option>
              {(veiculos as VeiculoOpt[] | undefined)?.filter((v) => Boolean(v?.id)).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa_serie} {v.tag_obra ? `- ${v.tag_obra}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Data de Chegada *</Label>
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
              <Label>KM de Chegada</Label>
              <Input type="number" placeholder="KM" value={form.km_entrada} onChange={(e) => setForm({ ...form, km_entrada: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Horímetro de Chegada</Label>
              <Input type="number" placeholder="Horas" value={form.horimetro_entrada} onChange={(e) => setForm({ ...form, horimetro_entrada: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Tipo de Manutenção *</Label>
            <select
              value={form.tipo_manutencao}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  tipo_manutencao: e.target.value as 'preventiva' | 'corretiva' | '',
                  subcategoria_corretiva: '',
                  tipo_revisao_id: '',
                }))
              }
              className={selectCls}
              translate="no"
            >
              <option value="">Selecione o tipo</option>
              <option value="corretiva">Corretiva</option>
              <option value="preventiva">Preventiva</option>
            </select>
          </div>

          {form.tipo_manutencao === 'corretiva' && (
            <>
              <div className="grid gap-2">
                <Label>Subcategoria</Label>
                <select
                  value={form.subcategoria_corretiva}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, subcategoria_corretiva: e.target.value as SubcategoriaCorretiva | '' }))
                  }
                  className={selectCls}
                  translate="no"
                >
                  <option value="">Selecione a subcategoria</option>
                  {SUBCATEGORIAS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Detalhamento</Label>
                <Textarea placeholder="Descreva o problema detalhadamente..." value={form.detalhamento} onChange={(e) => setForm({ ...form, detalhamento: e.target.value })} />
              </div>
            </>
          )}

          {form.tipo_manutencao === 'preventiva' && (
            <div className="grid gap-2">
              <Label>Tipo de Revisão</Label>
              <select
                value={form.tipo_revisao_id}
                onChange={(e) => setForm((p) => ({ ...p, tipo_revisao_id: e.target.value }))}
                className={selectCls}
                translate="no"
              >
                <option value="">Selecione o tipo de revisão</option>
                {tiposRevisao?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} {t.intervalo_padrao ? `(a cada ${t.intervalo_padrao} ${t.unidade_padrao})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <Label>Tem Avarias?</Label>
              <Switch checked={form.tem_avarias} onCheckedChange={(v) => setForm({ ...form, tem_avarias: v })} />
              <span className="text-sm text-muted-foreground">{form.tem_avarias ? 'Sim' : 'Não'}</span>
            </div>
          </div>

          {form.tem_avarias && (
            <>
              <div className="grid gap-2">
                <Label>Descrição das Avarias</Label>
                <Textarea placeholder="Descreva as avarias encontradas..." value={form.descricao_avarias} onChange={(e) => setForm({ ...form, descricao_avarias: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Fotos das Avarias</Label>
                <Input type="file" accept="image/*" multiple onChange={(e) => {
                  if (e.target.files) setFotos(Array.from(e.target.files));
                }} />
                {fotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {fotos.map((f, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                        <Camera className="h-3 w-3" /> {f.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
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

          <Button onClick={handleSubmit} disabled={createOS.isPending} className="w-full mt-2">
            {createOS.isPending ? 'Registrando...' : 'Registrar Entrada'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
