import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Pencil } from 'lucide-react';
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

const toDateString = (v?: string | null): string => {
  if (!v) return '';
  return v.includes('T') ? v.slice(0, 10) : v;
};

const numberFromString = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d+(\.\d+)?$/.test(v), 'Informe um número válido')
  .optional()
  .default('');

const editSchema = z
  .object({
    veiculo_id: z.string().min(1, 'Selecione o veículo'),
    tipo_manutencao: z.enum(['preventiva', 'corretiva', '']).default(''),
    subcategoria_corretiva: z.string().optional().default(''),
    detalhamento: z.string().trim().max(1000).optional().default(''),
    tipo_revisao_id: z.string().optional().default(''),
    data_entrada: z.string().min(1, 'Informe a data de entrada'),
    km_entrada: numberFromString,
    horimetro_entrada: numberFromString,
    tem_avarias: z.boolean().default(false),
    descricao_avarias: z.string().trim().max(1000).optional().default(''),
    previsao_saida: z.string().optional().default(''),
    status: z.enum(['aberta', 'em_andamento', 'concluida']),
    data_saida: z.string().optional().default(''),
    km_saida: numberFromString,
    horimetro_saida: numberFromString,
    avarias_resolvidas: z.boolean().default(true),
    observacoes_saida: z.string().trim().max(1000).optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.tipo_manutencao === 'corretiva' && !data.subcategoria_corretiva) {
      ctx.addIssue({ code: 'custom', path: ['subcategoria_corretiva'], message: 'Selecione a subcategoria' });
    }
    if (data.tem_avarias && !data.descricao_avarias?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['descricao_avarias'], message: 'Descreva as avarias' });
    }
    if (data.status === 'concluida' && !data.data_saida) {
      ctx.addIssue({ code: 'custom', path: ['data_saida'], message: 'Informe a data de saída' });
    }
  });

type EditForm = z.infer<typeof editSchema>;

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

  const defaults: EditForm = {
    veiculo_id: ordem.veiculo_id || '',
    tipo_manutencao: (ordem.tipo_manutencao || '') as TipoManutencao | '',
    subcategoria_corretiva: ordem.subcategoria_corretiva || '',
    detalhamento: ordem.detalhamento || '',
    tipo_revisao_id: ordem.tipo_revisao_id || '',
    data_entrada: toDateString(ordem.data_entrada) || toDateString(new Date().toISOString()),
    km_entrada: ordem.km_entrada?.toString() || '',
    horimetro_entrada: ordem.horimetro_entrada?.toString() || '',
    tem_avarias: ordem.tem_avarias || false,
    descricao_avarias: ordem.descricao_avarias || '',
    previsao_saida: toDateString(ordem.previsao_saida),
    status: (ordem.status || 'aberta') as StatusOrdemServico,
    data_saida: toDateString(ordem.data_saida),
    km_saida: ordem.km_saida?.toString() || '',
    horimetro_saida: ordem.horimetro_saida?.toString() || '',
    avarias_resolvidas: ordem.avarias_resolvidas ?? true,
    observacoes_saida: ordem.observacoes_saida || '',
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: defaults,
  });

  const tipoManutencao = watch('tipo_manutencao');
  const status = watch('status');
  const temAvarias = watch('tem_avarias');
  const avariasResolvidas = watch('avarias_resolvidas');

  const onSubmit = async (values: EditForm) => {
    try {
      await update.mutateAsync({
        id: ordem.id,
        veiculo_id: values.veiculo_id,
        tipo_manutencao: (values.tipo_manutencao || null) as TipoManutencao | null,
        subcategoria_corretiva:
          values.tipo_manutencao === 'corretiva' && values.subcategoria_corretiva
            ? (values.subcategoria_corretiva as SubcategoriaCorretiva)
            : null,
        detalhamento: values.detalhamento || null,
        tipo_revisao_id:
          values.tipo_manutencao === 'preventiva' && values.tipo_revisao_id ? values.tipo_revisao_id : null,
        data_entrada: values.data_entrada,
        km_entrada: values.km_entrada ? Number(values.km_entrada) : null,
        horimetro_entrada: values.horimetro_entrada ? Number(values.horimetro_entrada) : null,
        tem_avarias: values.tem_avarias,
        descricao_avarias: values.tem_avarias ? values.descricao_avarias || null : null,
        previsao_saida: values.previsao_saida || null,
        status: values.status,
        data_saida: values.data_saida || null,
        km_saida: values.km_saida ? Number(values.km_saida) : null,
        horimetro_saida: values.horimetro_saida ? Number(values.horimetro_saida) : null,
        avarias_resolvidas: values.tem_avarias ? values.avarias_resolvidas : null,
        observacoes_saida: values.observacoes_saida || null,
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
  const selectCls =
    'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset(defaults);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1"><Pencil className="h-3 w-3" /> Editar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ordem — {ordem.veiculo?.placa_serie}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4" noValidate>
          <div className="grid gap-2">
            <Label>Veículo / Equipamento</Label>
            <select className={selectCls} translate="no" aria-invalid={!!errors.veiculo_id} {...register('veiculo_id')}>
              <option value="">Selecione o veículo</option>
              {(veiculos as VeiculoOpt[] | undefined)?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa_serie} {v.tag_obra ? `- ${v.tag_obra}` : ''}
                </option>
              ))}
            </select>
            {errors.veiculo_id && <p className="text-xs text-destructive">{errors.veiculo_id.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Data de Entrada</Label>
              <Input type="date" aria-invalid={!!errors.data_entrada} {...register('data_entrada')} />
              {errors.data_entrada && <p className="text-xs text-destructive">{errors.data_entrada.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label>KM de Entrada</Label>
              <Input type="number" min={0} {...register('km_entrada')} />
              {errors.km_entrada && <p className="text-xs text-destructive">{errors.km_entrada.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Horímetro de Entrada</Label>
              <Input type="number" min={0} {...register('horimetro_entrada')} />
              {errors.horimetro_entrada && <p className="text-xs text-destructive">{errors.horimetro_entrada.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Tipo de Manutenção</Label>
              <select
                className={selectCls}
                translate="no"
                {...register('tipo_manutencao', {
                  onChange: () => {
                    setValue('subcategoria_corretiva', '');
                    setValue('tipo_revisao_id', '');
                  },
                })}
              >
                <option value="">Selecione</option>
                <option value="corretiva">Corretiva</option>
                <option value="preventiva">Preventiva</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <select className={selectCls} translate="no" {...register('status')}>
                <option value="aberta">Aberta</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>
          </div>

          {tipoManutencao === 'corretiva' && (
            <>
              <div className="grid gap-2">
                <Label>Subcategoria</Label>
                <select
                  className={selectCls}
                  translate="no"
                  aria-invalid={!!errors.subcategoria_corretiva}
                  {...register('subcategoria_corretiva')}
                >
                  <option value="">Selecione</option>
                  {SUBCATEGORIAS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {errors.subcategoria_corretiva && (
                  <p className="text-xs text-destructive">{errors.subcategoria_corretiva.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Detalhamento</Label>
                <Textarea {...register('detalhamento')} />
              </div>
            </>
          )}

          {tipoManutencao === 'preventiva' && (
            <div className="grid gap-2">
              <Label>Tipo de Revisão</Label>
              <select className={selectCls} translate="no" {...register('tipo_revisao_id')}>
                <option value="">Selecione</option>
                {tiposRevisao?.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Label>Tem Avarias?</Label>
            <Switch checked={temAvarias} onCheckedChange={(v) => setValue('tem_avarias', v, { shouldValidate: true })} />
            <span className="text-sm text-muted-foreground">{temAvarias ? 'Sim' : 'Não'}</span>
          </div>
          {temAvarias && (
            <div className="grid gap-2">
              <Label>Descrição das Avarias</Label>
              <Textarea aria-invalid={!!errors.descricao_avarias} {...register('descricao_avarias')} />
              {errors.descricao_avarias && (
                <p className="text-xs text-destructive">{errors.descricao_avarias.message}</p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label>Previsão de Saída</Label>
            <Input type="date" {...register('previsao_saida')} />
          </div>

          {status === 'concluida' && (
            <>
              <div className="border-t pt-4 mt-2">
                <Label className="text-base font-semibold">Dados de Saída</Label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label>Data de Saída</Label>
                  <Input type="date" aria-invalid={!!errors.data_saida} {...register('data_saida')} />
                  {errors.data_saida && <p className="text-xs text-destructive">{errors.data_saida.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>KM de Saída</Label>
                  <Input type="number" min={0} {...register('km_saida')} />
                  {errors.km_saida && <p className="text-xs text-destructive">{errors.km_saida.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Horímetro de Saída</Label>
                  <Input type="number" min={0} {...register('horimetro_saida')} />
                  {errors.horimetro_saida && <p className="text-xs text-destructive">{errors.horimetro_saida.message}</p>}
                </div>
              </div>
              {temAvarias && (
                <div className="flex items-center gap-3">
                  <Label>Avarias Resolvidas?</Label>
                  <Switch
                    checked={avariasResolvidas}
                    onCheckedChange={(v) => setValue('avarias_resolvidas', v)}
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label>Observações Finais</Label>
                <Textarea {...register('observacoes_saida')} />
              </div>
            </>
          )}

          <Button type="submit" disabled={isSubmitting || update.isPending} className="w-full mt-2">
            {isSubmitting || update.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
