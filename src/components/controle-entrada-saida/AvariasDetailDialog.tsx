import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ImageIcon } from 'lucide-react';
import { useAvariasFotos } from '@/hooks/useOrdensServico';
import { AvariaFotoThumb } from '@/components/oficina/AvariaFotoThumb';
import { OrdemServico } from '@/types/fleet';

interface Props {
  ordem: OrdemServico;
}

export function AvariasDetailDialog({ ordem }: Props) {
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
                {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-md" />)}
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
