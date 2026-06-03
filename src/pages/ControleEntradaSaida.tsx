import { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOrdensServicoPaginated, useCreateOrdemServico, useUpdateOrdemServico, useDeleteOrdemServico, useUploadAvariaFoto, useAvariasFotos } from '@/hooks/useOrdensServico';
import { useVeiculos } from '@/hooks/useFleetData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Plus, CalendarIcon, ClipboardList, Camera, CheckCircle2, Clock, AlertTriangle, ImageIcon, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SubcategoriaCorretiva, StatusOrdemServico } from '@/types/fleet';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { AvariaFotoThumb } from '@/components/oficina/AvariaFotoThumb';

const PAGE_SIZE = 20;

function AvariasDetailDialog({ ordem }: { ordem: any }) {
  const [open, setOpen] = useState(false);
  const { data: fotos, isLoading } = useAvariasFotos(open ? ordem.id : null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Badge variant="destructive" className="text-xs cursor-pointer hover:opacity-80 transition-opacity">
          Sim
        </Badge>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Avarias — {ordem.veiculo?.placa_serie}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {ordem.descricao_avarias ? (
            <div className="space-y-1">
              <Label className="text-sm font-medium">Descrição das Avarias</Label>
              <p className="text-sm text-muted-foreground bg-muted rounded-md p-3">{ordem.descricao_avarias}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhuma descrição registrada.</p>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <ImageIcon className="h-4 w-4" /> Fotos
            </Label>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-md" />)}
              </div>
            ) : fotos && fotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {fotos.map((f) => (
                  <AvariaFotoThumb key={f.id} urlOrPath={f.foto_url} alt={f.descricao || undefined} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nenhuma foto anexada.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const SUBCATEGORIAS: { value: SubcategoriaCorretiva; label: string }[] = [
  { value: 'borracharia', label: 'Borracharia' },
  { value: 'mecanica', label: 'Mecânica' },
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'ar_condicionado', label: 'Ar Condicionado' },
  { value: 'outros', label: 'Outros' },
];

const STATUS_CONFIG: Record<StatusOrdemServico, { label: string; variant: 'destructive' | 'secondary' | 'default'; icon: typeof Clock }> = {
  aberta: { label: 'Aberta', variant: 'destructive', icon: AlertTriangle },
  em_andamento: { label: 'Em Andamento', variant: 'secondary', icon: Clock },
  concluida: { label: 'Concluída', variant: 'default', icon: CheckCircle2 },
};

function NovaEntradaDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: veiculos } = useVeiculos();
  const { data: tiposRevisao } = useQuery({
    queryKey: ['tipos_revisao'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tipos_revisao').select('*').order('nome');
      if (error) throw error;
      return data;
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

      // Upload fotos de avarias
      if (form.tem_avarias && fotos.length > 0) {
        for (const file of fotos) {
          await uploadFoto.mutateAsync({ ordemServicoId: (result as any).id, file });
        }
      }

      toast.success('Entrada registrada com sucesso!');
      resetForm();
      onSuccess();
      // Delay closing to let portaled elements (Select, Popover) unmount cleanly
      setTimeout(() => setOpen(false), 0);
    } catch (e: any) {
      toast.error('Erro ao registrar entrada: ' + e.message);
    }
  };

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
          {/* Veículo */}
          <div className="grid gap-2">
            <Label>Veículo / Equipamento *</Label>
            <select
              value={form.veiculo_id}
              onChange={(e) => setForm((prev) => ({ ...prev, veiculo_id: e.target.value }))}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              translate="no"
            >
              <option value="">Selecione o veículo</option>
              {veiculos?.filter((v: any) => Boolean(v?.id)).map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.placa_serie} {v.tag_obra ? `- ${v.tag_obra}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Data de Chegada, KM, Horímetro */}
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

          {/* Tipo de Manutenção */}
          <div className="grid gap-2">
            <Label>Tipo de Manutenção *</Label>
            <select
              value={form.tipo_manutencao}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  tipo_manutencao: e.target.value as 'preventiva' | 'corretiva' | '',
                  subcategoria_corretiva: '',
                  tipo_revisao_id: '',
                }))
              }
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              translate="no"
            >
              <option value="">Selecione o tipo</option>
              <option value="corretiva">Corretiva</option>
              <option value="preventiva">Preventiva</option>
            </select>
          </div>

          {/* Corretiva: subcategoria + detalhamento */}
          {form.tipo_manutencao === 'corretiva' && (
            <>
              <div className="grid gap-2">
                <Label>Subcategoria</Label>
                <select
                  value={form.subcategoria_corretiva}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      subcategoria_corretiva: e.target.value as SubcategoriaCorretiva | '',
                    }))
                  }
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  translate="no"
                >
                  <option value="">Selecione a subcategoria</option>
                  {SUBCATEGORIAS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Detalhamento</Label>
                <Textarea placeholder="Descreva o problema detalhadamente..." value={form.detalhamento} onChange={(e) => setForm({ ...form, detalhamento: e.target.value })} />
              </div>
            </>
          )}

          {/* Preventiva: tipo de revisão */}
          {form.tipo_manutencao === 'preventiva' && (
            <div className="grid gap-2">
              <Label>Tipo de Revisão</Label>
              <select
                value={form.tipo_revisao_id}
                onChange={(e) => setForm((prev) => ({ ...prev, tipo_revisao_id: e.target.value }))}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                translate="no"
              >
                <option value="">Selecione o tipo de revisão</option>
                {tiposRevisao?.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} {t.intervalo_padrao ? `(a cada ${t.intervalo_padrao} ${t.unidade_padrao})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Avarias */}
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

          {/* Previsão de Saída */}
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

function RegistrarSaidaDialog({ ordem, onSuccess }: { ordem: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateOrdemServico();
  const [form, setForm] = useState({
    data_saida: new Date(),
    km_saida: '',
    horimetro_saida: '',
    avarias_resolvidas: true,
    observacoes_saida: '',
  });

  const handleSubmit = async () => {
    try {
      await update.mutateAsync({
        id: ordem.id,
        data_saida: format(form.data_saida, 'yyyy-MM-dd'),
        km_saida: form.km_saida ? Number(form.km_saida) : null,
        horimetro_saida: form.horimetro_saida ? Number(form.horimetro_saida) : null,
        avarias_resolvidas: ordem.tem_avarias ? form.avarias_resolvidas : null,
        observacoes_saida: form.observacoes_saida || null,
        status: 'concluida',
      });
      toast.success('Saída registrada com sucesso!');
      setOpen(false);
      onSuccess();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><CheckCircle2 className="h-3 w-3 mr-1" /> Registrar Saída</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Saída — {ordem.veiculo?.placa_serie}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Data de Saída</Label>
              <Input
                type="date"
                value={format(form.data_saida, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const d = e.target.value ? new Date(e.target.value + 'T12:00:00') : new Date();
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

          {ordem.tem_avarias && (
            <div className="flex items-center gap-3">
              <Label>Avarias Resolvidas?</Label>
              <Switch checked={form.avarias_resolvidas} onCheckedChange={(v) => setForm({ ...form, avarias_resolvidas: v })} />
              <span className="text-sm text-muted-foreground">{form.avarias_resolvidas ? 'Sim' : 'Não'}</span>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Observações Finais</Label>
            <Textarea placeholder="Observações sobre a saída..." value={form.observacoes_saida} onChange={(e) => setForm({ ...form, observacoes_saida: e.target.value })} />
          </div>

          <Button onClick={handleSubmit} disabled={update.isPending} className="w-full">
            {update.isPending ? 'Registrando...' : 'Confirmar Saída'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditOrdemDialog({ ordem, onSuccess }: { ordem: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateOrdemServico();
  const { data: veiculos } = useVeiculos();
  const { data: tiposRevisao } = useQuery({
    queryKey: ['tipos_revisao'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tipos_revisao').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    veiculo_id: ordem.veiculo_id || '',
    tipo_manutencao: ordem.tipo_manutencao || '',
    subcategoria_corretiva: ordem.subcategoria_corretiva || '',
    detalhamento: ordem.detalhamento || '',
    tipo_revisao_id: ordem.tipo_revisao_id || '',
    data_entrada: ordem.data_entrada ? new Date(ordem.data_entrada.includes('T') ? ordem.data_entrada : `${ordem.data_entrada}T12:00:00`) : new Date(),
    km_entrada: ordem.km_entrada?.toString() || '',
    horimetro_entrada: ordem.horimetro_entrada?.toString() || '',
    tem_avarias: ordem.tem_avarias || false,
    descricao_avarias: ordem.descricao_avarias || '',
    previsao_saida: ordem.previsao_saida ? new Date(ordem.previsao_saida.includes('T') ? ordem.previsao_saida : `${ordem.previsao_saida}T12:00:00`) : undefined as Date | undefined,
    status: ordem.status || 'aberta',
    data_saida: ordem.data_saida ? new Date(ordem.data_saida.includes('T') ? ordem.data_saida : `${ordem.data_saida}T12:00:00`) : undefined as Date | undefined,
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
    } catch (e: any) {
      toast.error('Erro ao atualizar: ' + e.message);
    }
  };

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
          {/* Veículo */}
          <div className="grid gap-2">
            <Label>Veículo / Equipamento</Label>
            <Select value={form.veiculo_id} onValueChange={(v) => setForm({ ...form, veiculo_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
              <SelectContent>
                {veiculos?.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>{v.placa_serie} {v.tag_obra ? `- ${v.tag_obra}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data de Entrada, KM, Horímetro */}
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Data de Entrada</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(form.data_entrada, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.data_entrada} onSelect={(d) => d && setForm({ ...form, data_entrada: d })} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
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

          {/* Tipo + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Tipo de Manutenção</Label>
              <Select value={form.tipo_manutencao} onValueChange={(v) => setForm({ ...form, tipo_manutencao: v as any, subcategoria_corretiva: '', tipo_revisao_id: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Corretiva */}
          {form.tipo_manutencao === 'corretiva' && (
            <>
              <div className="grid gap-2">
                <Label>Subcategoria</Label>
                <Select value={form.subcategoria_corretiva} onValueChange={(v) => setForm({ ...form, subcategoria_corretiva: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {SUBCATEGORIAS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Detalhamento</Label>
                <Textarea value={form.detalhamento} onChange={(e) => setForm({ ...form, detalhamento: e.target.value })} />
              </div>
            </>
          )}

          {/* Preventiva */}
          {form.tipo_manutencao === 'preventiva' && (
            <div className="grid gap-2">
              <Label>Tipo de Revisão</Label>
              <Select value={form.tipo_revisao_id} onValueChange={(v) => setForm({ ...form, tipo_revisao_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tiposRevisao?.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Avarias */}
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

          {/* Previsão de Saída */}
          <div className="grid gap-2">
            <Label>Previsão de Saída</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !form.previsao_saida && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.previsao_saida ? format(form.previsao_saida, 'dd/MM/yyyy') : 'Sem previsão'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={form.previsao_saida} onSelect={(d) => setForm({ ...form, previsao_saida: d })} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Dados de Saída (se concluída) */}
          {form.status === 'concluida' && (
            <>
              <div className="border-t pt-4 mt-2">
                <Label className="text-base font-semibold">Dados de Saída</Label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label>Data de Saída</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start text-left font-normal", !form.data_saida && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.data_saida ? format(form.data_saida, 'dd/MM/yyyy') : 'Selecione'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.data_saida} onSelect={(d) => setForm({ ...form, data_saida: d })} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
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

export default function ControleEntradaSaida() {
  const { data: isAdmin } = useIsAdmin();
  const deleteOS = useDeleteOrdemServico();
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

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filters]);

  const { data: pageData, isLoading, isFetching, refetch } = useOrdensServicoPaginated(page, PAGE_SIZE, filters);
  const ordens = pageData?.rows ?? [];
  const total = pageData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);

  const veiculosFiltrados = useMemo(() => {
    if (!veiculos) return [];
    const term = veiculoSearch.trim().toLowerCase();
    if (!term) return veiculos.slice(0, 100);
    return veiculos
      .filter((v: any) =>
        v.placa_serie?.toLowerCase().includes(term) ||
        v.tag_obra?.toLowerCase().includes(term),
      )
      .slice(0, 100);
  }, [veiculos, veiculoSearch]);

  const formatDateSafe = (dateValue?: string | null) => {
    if (!dateValue) return '-';
    const normalized = dateValue.includes('T') ? dateValue : `${dateValue}T12:00:00`;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return '-';
    return format(parsed, 'dd/MM/yyyy');
  };

  const hasActiveFilters =
    filtroStatus !== 'all' ||
    filtroTipo !== 'all' ||
    filtroVeiculo !== 'all' ||
    !!dataInicio ||
    !!dataFim;

  const clearAll = () => {
    setFiltroStatus('all');
    setFiltroTipo('all');
    setFiltroVeiculo('all');
    setVeiculoSearch('');
    setDataInicio('');
    setDataFim('');
  };

  const ordensFiltradas = ordens;


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

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="grid gap-1.5 min-w-[220px] flex-1">
            <Label className="text-xs">Veículo</Label>
            <div className="flex flex-col gap-1">
              <Input
                type="search"
                placeholder="Buscar placa ou tag..."
                value={veiculoSearch}
                onChange={(e) => setVeiculoSearch(e.target.value)}
                className="h-9"
              />
              <select
                value={filtroVeiculo}
                onChange={(e) => setFiltroVeiculo(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                translate="no"
              >
                <option value="all">Todos os veículos</option>
                {veiculosFiltrados.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.placa_serie}{v.tag_obra ? ` - ${v.tag_obra}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
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
            <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
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
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-9 w-[160px]"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">até</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-9 w-[160px]"
            />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-9 gap-1">
              <X className="h-4 w-4" /> Limpar
            </Button>
          )}
        </div>

        {/* Contador + paginação topo */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            {total === 0 ? (
              'Nenhuma ordem encontrada'
            ) : (
              <>
                Mostrando <span className="font-medium text-foreground">{startIndex}-{endIndex}</span> de{' '}
                <span className="font-medium text-foreground">{total}</span> ordens
                {isFetching && <span className="ml-2 text-xs italic">(atualizando...)</span>}
              </>
            )}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
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
                disabled={page === totalPages || isFetching}
              >
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>


        {/* Tabela */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Subcategoria / Revisão</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Previsão Saída</TableHead>
                    <TableHead>Avarias</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordensFiltradas?.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma ordem de serviço encontrada</TableCell></TableRow>
                  )}
                  {ordensFiltradas?.map((o) => {
                    const sc = STATUS_CONFIG[o.status as StatusOrdemServico] ?? STATUS_CONFIG.aberta;
                    const Icon = sc.icon;

                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">
                          {o.veiculo?.placa_serie}
                          {o.veiculo?.tag_obra && <span className="text-xs text-muted-foreground ml-1">({o.veiculo.tag_obra})</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={o.tipo_manutencao === 'corretiva' ? 'destructive' : 'secondary'}>
                            {o.tipo_manutencao === 'corretiva' ? 'Corretiva' : 'Preventiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {o.tipo_manutencao === 'corretiva'
                            ? SUBCATEGORIAS.find((s) => s.value === o.subcategoria_corretiva)?.label || '-'
                            : (o as any).tipo_revisao?.nome || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateSafe(o.data_entrada)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateSafe(o.previsao_saida)}
                        </TableCell>
                        <TableCell>
                          {o.tem_avarias ? (
                            <AvariasDetailDialog ordem={o} />
                          ) : (
                            <span className="text-xs text-muted-foreground">Não</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sc.variant} className="gap-1">
                            <Icon className="h-3 w-3" /> {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {o.status !== 'concluida' && (
                              <RegistrarSaidaDialog ordem={o} onSuccess={() => refetch()} />
                            )}
                            {o.status === 'concluida' && o.data_saida && (
                              <span className="text-xs text-muted-foreground">
                                Saiu em {formatDateSafe(o.data_saida)}
                              </span>
                            )}
                            {isAdmin && (
                              <>
                                <EditOrdemDialog ordem={o} onSuccess={() => refetch()} />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir Ordem de Serviço</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir esta ordem de serviço do veículo <strong>{o.veiculo?.placa_serie}</strong>? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={async () => {
                                          try {
                                            await deleteOS.mutateAsync(o.id);
                                            toast.success('Ordem excluída com sucesso!');
                                            refetch();
                                          } catch (e: any) {
                                            toast.error('Erro ao excluir: ' + e.message);
                                          }
                                        }}
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
