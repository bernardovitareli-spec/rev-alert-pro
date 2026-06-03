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

interface Props { onSuccess: () => void }

const numberFromString = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d+(\.\d+)?$/.test(v), 'Informe um número válido')
  .optional()
  .default('');

const novaEntradaSchema = z
  .object({
    veiculo_id: z.string().min(1, 'Selecione o veículo'),
    tipo_manutencao: z.enum(['preventiva', 'corretiva'], { errorMap: () => ({ message: 'Selecione o tipo de manutenção' }) }),
    subcategoria_corretiva: z.string().optional().default(''),
    detalhamento: z.string().trim().max(1000, 'Máximo 1000 caracteres').optional().default(''),
    tipo_revisao_id: z.string().optional().default(''),
    data_entrada: z.string().min(1, 'Informe a data de chegada'),
    km_entrada: numberFromString,
    horimetro_entrada: numberFromString,
    tem_avarias: z.boolean().default(false),
    descricao_avarias: z.string().trim().max(1000, 'Máximo 1000 caracteres').optional().default(''),
    previsao_saida: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.tipo_manutencao === 'corretiva' && !data.subcategoria_corretiva) {
      ctx.addIssue({ code: 'custom', path: ['subcategoria_corretiva'], message: 'Selecione a subcategoria' });
    }
    if (data.tem_avarias && !data.descricao_avarias?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['descricao_avarias'], message: 'Descreva as avarias' });
    }
  });

type NovaEntradaForm = z.infer<typeof novaEntradaSchema>;

const today = format(new Date(), 'yyyy-MM-dd');

const defaults: NovaEntradaForm = {
  veiculo_id: '',
  tipo_manutencao: undefined as unknown as 'preventiva' | 'corretiva',
  subcategoria_corretiva: '',
  detalhamento: '',
  tipo_revisao_id: '',
  data_entrada: today,
  km_entrada: '',
  horimetro_entrada: '',
  tem_avarias: false,
  descricao_avarias: '',
  previsao_saida: '',
};

export function NovaEntradaDialog({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NovaEntradaForm>({
    resolver: zodResolver(novaEntradaSchema),
    defaultValues: defaults,
  });

  const tipoManutencao = watch('tipo_manutencao');
  const temAvarias = watch('tem_avarias');

  const resetAll = () => {
    reset(defaults);
    setFotos([]);
  };

  const onSubmit = async (values: NovaEntradaForm) => {
    try {
      const result = await createOS.mutateAsync({
        veiculo_id: values.veiculo_id,
        tipo_manutencao: values.tipo_manutencao,
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
      });

      if (values.tem_avarias && fotos.length > 0) {
        for (const file of fotos) {
          await uploadFoto.mutateAsync({ ordemServicoId: (result as { id: string }).id, file });
        }
      }

      toast.success('Entrada registrada com sucesso!');
      resetAll();
      onSuccess();
      setTimeout(() => setOpen(false), 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('Erro ao registrar entrada: ' + msg);
    }
  };

  const selectCls =
    'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetAll();
      }}
    >
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Nova Entrada</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Entrada de Equipamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4" noValidate>
          <div className="grid gap-2">
            <Label>Veículo / Equipamento *</Label>
            <select className={selectCls} translate="no" aria-invalid={!!errors.veiculo_id} {...register('veiculo_id')}>
              <option value="">Selecione o veículo</option>
              {(veiculos as VeiculoOpt[] | undefined)?.filter((v) => Boolean(v?.id)).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa_serie} {v.tag_obra ? `- ${v.tag_obra}` : ''}
                </option>
              ))}
            </select>
            {errors.veiculo_id && <p className="text-xs text-destructive">{errors.veiculo_id.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Data de Chegada *</Label>
              <Input type="date" aria-invalid={!!errors.data_entrada} {...register('data_entrada')} />
              {errors.data_entrada && <p className="text-xs text-destructive">{errors.data_entrada.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label>KM de Chegada</Label>
              <Input type="number" min={0} placeholder="KM" aria-invalid={!!errors.km_entrada} {...register('km_entrada')} />
              {errors.km_entrada && <p className="text-xs text-destructive">{errors.km_entrada.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Horímetro de Chegada</Label>
              <Input type="number" min={0} placeholder="Horas" aria-invalid={!!errors.horimetro_entrada} {...register('horimetro_entrada')} />
              {errors.horimetro_entrada && <p className="text-xs text-destructive">{errors.horimetro_entrada.message}</p>}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Tipo de Manutenção *</Label>
            <select
              className={selectCls}
              translate="no"
              aria-invalid={!!errors.tipo_manutencao}
              {...register('tipo_manutencao', {
                onChange: () => {
                  setValue('subcategoria_corretiva', '');
                  setValue('tipo_revisao_id', '');
                },
              })}
            >
              <option value="">Selecione o tipo</option>
              <option value="corretiva">Corretiva</option>
              <option value="preventiva">Preventiva</option>
            </select>
            {errors.tipo_manutencao && <p className="text-xs text-destructive">{errors.tipo_manutencao.message}</p>}
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
                  <option value="">Selecione a subcategoria</option>
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
                <Textarea placeholder="Descreva o problema detalhadamente..." {...register('detalhamento')} />
                {errors.detalhamento && <p className="text-xs text-destructive">{errors.detalhamento.message}</p>}
              </div>
            </>
          )}

          {tipoManutencao === 'preventiva' && (
            <div className="grid gap-2">
              <Label>Tipo de Revisão</Label>
              <select className={selectCls} translate="no" {...register('tipo_revisao_id')}>
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
              <Switch checked={temAvarias} onCheckedChange={(v) => setValue('tem_avarias', v, { shouldValidate: true })} />
              <span className="text-sm text-muted-foreground">{temAvarias ? 'Sim' : 'Não'}</span>
            </div>
          </div>

          {temAvarias && (
            <>
              <div className="grid gap-2">
                <Label>Descrição das Avarias</Label>
                <Textarea
                  placeholder="Descreva as avarias encontradas..."
                  aria-invalid={!!errors.descricao_avarias}
                  {...register('descricao_avarias')}
                />
                {errors.descricao_avarias && (
                  <p className="text-xs text-destructive">{errors.descricao_avarias.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Fotos das Avarias</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) setFotos(Array.from(e.target.files));
                  }}
                />
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
            <Input type="date" {...register('previsao_saida')} />
          </div>

          <Button type="submit" disabled={isSubmitting || createOS.isPending} className="w-full mt-2">
            {isSubmitting || createOS.isPending ? 'Registrando...' : 'Registrar Entrada'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
