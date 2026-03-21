import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOrdensServico, useCreateOrdemServico, useUpdateOrdemServico, useUploadAvariaFoto, useAvariasFotos } from '@/hooks/useOrdensServico';
import { useVeiculos } from '@/hooks/useFleetData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Plus, CalendarIcon, ClipboardList, Camera, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { SubcategoriaCorretiva, StatusOrdemServico } from '@/types/fleet';

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
      setOpen(false);
      onSuccess();
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
            <Select value={form.veiculo_id} onValueChange={(v) => setForm({ ...form, veiculo_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
              <SelectContent>
                {veiculos?.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>{v.placa_serie} {v.tag_obra ? `- ${v.tag_obra}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data de Chegada, KM, Horímetro */}
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Data de Chegada *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !form.data_entrada && "text-muted-foreground")}>
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
            <Select value={form.tipo_manutencao} onValueChange={(v) => setForm({ ...form, tipo_manutencao: v as any, subcategoria_corretiva: '', tipo_revisao_id: '' })}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="corretiva">Corretiva</SelectItem>
                <SelectItem value="preventiva">Preventiva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Corretiva: subcategoria + detalhamento */}
          {form.tipo_manutencao === 'corretiva' && (
            <>
              <div className="grid gap-2">
                <Label>Subcategoria</Label>
                <Select value={form.subcategoria_corretiva} onValueChange={(v) => setForm({ ...form, subcategoria_corretiva: v as SubcategoriaCorretiva })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a subcategoria" /></SelectTrigger>
                  <SelectContent>
                    {SUBCATEGORIAS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Select value={form.tipo_revisao_id} onValueChange={(v) => setForm({ ...form, tipo_revisao_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo de revisão" /></SelectTrigger>
                <SelectContent>
                  {tiposRevisao?.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome} {t.intervalo_padrao ? `(a cada ${t.intervalo_padrao} ${t.unidade_padrao})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !form.previsao_saida && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.previsao_saida ? format(form.previsao_saida, 'dd/MM/yyyy') : 'Selecione uma data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={form.previsao_saida} onSelect={(d) => setForm({ ...form, previsao_saida: d })} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(form.data_saida, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.data_saida} onSelect={(d) => d && setForm({ ...form, data_saida: d })} className="p-3 pointer-events-auto" />
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

export default function ControleEntradaSaida() {
  const { data: ordens, isLoading, refetch } = useOrdensServico();
  const [filtroStatus, setFiltroStatus] = useState<StatusOrdemServico | 'all'>('all');
  const [filtroTipo, setFiltroTipo] = useState<'preventiva' | 'corretiva' | 'all'>('all');

  const ordensFiltradas = ordens?.filter((o) => {
    if (filtroStatus !== 'all' && o.status !== filtroStatus) return false;
    if (filtroTipo !== 'all' && o.tipo_manutencao !== filtroTipo) return false;
    return true;
  });

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
        <div className="flex gap-3">
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="corretiva">Corretiva</SelectItem>
              <SelectItem value="preventiva">Preventiva</SelectItem>
            </SelectContent>
          </Select>
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
                    const sc = STATUS_CONFIG[o.status as StatusOrdemServico];
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
                            ? SUBCATEGORIAS.find(s => s.value === o.subcategoria_corretiva)?.label || '-'
                            : (o as any).tipo_revisao?.nome || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {o.data_entrada ? format(new Date(o.data_entrada + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {o.previsao_saida ? format(new Date(o.previsao_saida + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {o.tem_avarias ? (
                            <Badge variant="destructive" className="text-xs">Sim</Badge>
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
                          {o.status !== 'concluida' && (
                            <RegistrarSaidaDialog ordem={o} onSuccess={() => refetch()} />
                          )}
                          {o.status === 'concluida' && o.data_saida && (
                            <span className="text-xs text-muted-foreground">
                              Saiu em {format(new Date(o.data_saida + 'T12:00:00'), 'dd/MM/yyyy')}
                            </span>
                          )}
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
