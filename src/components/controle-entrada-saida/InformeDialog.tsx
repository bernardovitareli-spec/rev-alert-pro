import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, Share2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { OrdemServico, TipoRevisao } from '@/types/fleet';
import { InformeCard } from './InformeCard';
import { formatDateSafe } from './constants';

type OrdemFull = OrdemServico & { tipo_revisao?: TipoRevisao | null };

interface Props {
  ordem: OrdemFull;
  triggerVariant?: 'ghost' | 'outline' | 'default';
  triggerSize?: 'sm' | 'default';
  triggerLabel?: string;
  iconOnly?: boolean;
}

export function InformeDialog({
  ordem,
  triggerVariant = 'ghost',
  triggerSize = 'sm',
  triggerLabel = 'Gerar Informe',
  iconOnly = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | 'png' | 'pdf' | 'share'>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const tag = ordem.veiculo?.tag_obra || ordem.veiculo?.placa_serie || 'equipamento';
  const safeTag = tag.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const dateStr = formatDateSafe(ordem.data_saida || ordem.data_entrada).replace(/\//g, '-');
  const baseName = `Informe_Liberacao_${safeTag}_${dateStr}`;

  const render = async () => {
    if (!cardRef.current) throw new Error('Card não pronto');
    // wait a tick to ensure images loaded
    await new Promise((r) => setTimeout(r, 100));
    return toPng(cardRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
    });
  };

  const handlePng = async () => {
    try {
      setBusy('png');
      const dataUrl = await render();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${baseName}.png`;
      a.click();
      toast.success('PNG baixado');
    } catch (e) {
      toast.error('Erro ao gerar PNG: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = async () => {
    try {
      setBusy('pdf');
      const dataUrl = await render();
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => (img.onload = res));
      const pdf = new jsPDF({
        orientation: img.width > img.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [img.width, img.height],
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
      pdf.save(`${baseName}.pdf`);
      toast.success('PDF baixado');
    } catch (e) {
      toast.error('Erro ao gerar PDF: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    try {
      setBusy('share');
      const dataUrl = await render();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${baseName}.png`, { type: 'image/png' });
      const status = ordem.status === 'concluida' ? 'Liberado' : 'Em manutenção';
      const summary = `Equipamento: ${ordem.veiculo?.placa_serie || '-'} | TAG: ${tag} | Status: ${status}${
        ordem.data_saida ? ` | Liberado em ${formatDateSafe(ordem.data_saida)}` : ''
      }`;

      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: 'Informe MC Terraplenagem', text: summary });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank');
        toast.info('Compartilhamento direto indisponível — abrimos o WhatsApp Web com o resumo.');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        toast.error('Erro ao compartilhar: ' + (e instanceof Error ? e.message : String(e)));
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className="gap-1" aria-label="Gerar Informe">
          <FileText className="h-3 w-3" aria-hidden="true" />
          {!iconOnly && <span>{triggerLabel}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pré-visualização do Informe</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 pb-2 sticky top-0 bg-background z-10">
          <Button onClick={handlePng} disabled={busy !== null} size="sm">
            {busy === 'png' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1" />}
            Baixar PNG
          </Button>
          <Button onClick={handlePdf} disabled={busy !== null} size="sm" variant="secondary">
            {busy === 'pdf' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Baixar PDF
          </Button>
          <Button onClick={handleShare} disabled={busy !== null} size="sm" variant="outline">
            {busy === 'share' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Share2 className="h-4 w-4 mr-1" />}
            Compartilhar (WhatsApp)
          </Button>
        </div>

        {/* Scaled preview */}
        <div className="w-full overflow-auto bg-muted/30 rounded-md p-4 flex justify-center">
          <div
            style={{
              width: 1080,
              transform: 'scale(var(--informe-scale, 0.6))',
              transformOrigin: 'top center',
              height: 'auto',
            }}
            className="[--informe-scale:0.45] sm:[--informe-scale:0.6]"
          >
            <InformeCard ref={cardRef} order={ordem} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
