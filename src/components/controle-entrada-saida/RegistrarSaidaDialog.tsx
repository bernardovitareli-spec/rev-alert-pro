import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useUpdateOrdemServico } from '@/hooks/useOrdensServico';
import { OrdemServico } from '@/types/fleet';

interface Props {
  ordem: OrdemServico;
  onSuccess: () => void;
}

export function RegistrarSaidaDialog({ ordem, onSuccess }: Props) {
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('Erro: ' + msg);
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
