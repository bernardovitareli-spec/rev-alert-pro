import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ORDENS_HEADERS, MAX_EXPORT_ROWS, fetchOrdensRows,
  downloadCsv, downloadXlsx, todayStamp,
} from '@/lib/dataExports';
import type { OrdensServicoFilters } from '@/hooks/useOrdensServico';

interface Props {
  filters?: OrdensServicoFilters;
  label?: string;
}

export function ExportOrdensButton({ filters = {}, label = '📥 Exportar' }: Props) {
  const [busy, setBusy] = useState<'csv' | 'xlsx' | null>(null);

  const run = async (kind: 'csv' | 'xlsx') => {
    setBusy(kind);
    const toastId = toast.loading('Gerando arquivo...');
    try {
      const { rows, truncated } = await fetchOrdensRows(filters);
      if (rows.length === 0) {
        toast.warning('Nenhum dado para exportar com os filtros atuais', { id: toastId });
        return;
      }
      const filename = `controle-entrada-saida_${todayStamp()}.${kind}`;
      if (kind === 'csv') downloadCsv(filename, ORDENS_HEADERS, rows);
      else await downloadXlsx(filename, 'Ordens', ORDENS_HEADERS, rows);
      toast.success(
        truncated
          ? `Download iniciado (limite de ${MAX_EXPORT_ROWS} linhas atingido)`
          : 'Download iniciado',
        { id: toastId },
      );
    } catch (err: any) {
      console.error('[ExportOrdens]', err);
      toast.error('Não foi possível gerar o arquivo. Tente novamente em alguns segundos.', { id: toastId });
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" disabled={!!busy} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run('csv')} disabled={!!busy}>
          <FileText className="h-4 w-4 mr-2" /> Exportar CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run('xlsx')} disabled={!!busy}>
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Excel (.xlsx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
