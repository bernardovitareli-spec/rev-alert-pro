import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Download, FileSpreadsheet, FileText, Loader2, Truck, Wrench, History, ClipboardList,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ORDENS_HEADERS, VEICULOS_HEADERS, REVISOES_HEADERS, HISTORICO_HEADERS,
  MAX_EXPORT_ROWS,
  fetchOrdensRows, fetchVeiculosRows, fetchRevisoesRows, fetchHistoricoRows,
  downloadCsv, downloadXlsx, todayStamp,
} from '@/lib/dataExports';

type Kind = 'csv' | 'xlsx';

interface ExportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  countTable: 'ordens_servico' | 'veiculos' | 'revisoes' | 'historico_revisoes';
  filenameBase: string;
  sheetName: string;
  headers: string[];
  fetcher: () => Promise<{ rows: any[][]; truncated: boolean }>;
}

function ExportCard({ icon, title, description, countTable, filenameBase, sheetName, headers, fetcher }: ExportCardProps) {
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<Kind | null>(null);

  useEffect(() => {
    supabase.from(countTable).select('*', { count: 'exact', head: true })
      .then(({ count }) => setCount(count ?? 0));
  }, [countTable]);

  const run = async (kind: Kind) => {
    setBusy(kind);
    const toastId = toast.loading('Gerando arquivo...');
    try {
      const { rows, truncated } = await fetcher();
      if (rows.length === 0) {
        toast.warning('Nenhum dado para exportar', { id: toastId });
        return;
      }
      const filename = `${filenameBase}_${todayStamp()}.${kind}`;
      if (kind === 'csv') downloadCsv(filename, headers, rows);
      else await downloadXlsx(filename, sheetName, headers, rows);
      toast.success(
        truncated
          ? `Download iniciado (limite de ${MAX_EXPORT_ROWS} linhas atingido)`
          : 'Download iniciado',
        { id: toastId },
      );
    } catch (err: any) {
      console.error('[Export]', filenameBase, err);
      toast.error('Não foi possível gerar o arquivo. Tente novamente em alguns segundos.', { id: toastId });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
            <p className="text-xs text-muted-foreground mt-1">
              {count === null ? 'Calculando…' : `~${count.toLocaleString('pt-BR')} registros`}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button onClick={() => run('csv')} disabled={!!busy} variant="outline" size="sm" className="gap-2">
          {busy === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          CSV
        </Button>
        <Button onClick={() => run('xlsx')} disabled={!!busy} size="sm" className="gap-2">
          {busy === 'xlsx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          Excel
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminExportarOrdens() {
  const { data: isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return <AppLayout><div className="p-8 text-muted-foreground">Carregando...</div></AppLayout>;
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <Download className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exportar Dados</h1>
            <p className="text-sm text-muted-foreground">
              Baixe os dados do sistema em CSV ou Excel para análises externas.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ExportCard
            icon={<ClipboardList className="h-5 w-5 text-primary" />}
            title="Controle de Entrada/Saída"
            description="Todas as ordens de serviço com cálculo de dias em oficina e atrasos."
            countTable="ordens_servico"
            filenameBase="controle-entrada-saida"
            sheetName="Ordens"
            headers={ORDENS_HEADERS}
            fetcher={() => fetchOrdensRows({})}
          />
          <ExportCard
            icon={<Truck className="h-5 w-5 text-primary" />}
            title="Veículos da Frota"
            description="Lista de veículos com KM, horímetro e datas de pátio."
            countTable="veiculos"
            filenameBase="veiculos"
            sheetName="Veiculos"
            headers={VEICULOS_HEADERS}
            fetcher={fetchVeiculosRows}
          />
          <ExportCard
            icon={<Wrench className="h-5 w-5 text-primary" />}
            title="Revisões Programadas"
            description="Revisões com tipo, intervalo, oficina, previsão de entrega e valor."
            countTable="revisoes"
            filenameBase="revisoes-programadas"
            sheetName="Revisoes"
            headers={REVISOES_HEADERS}
            fetcher={fetchRevisoesRows}
          />
          <ExportCard
            icon={<History className="h-5 w-5 text-primary" />}
            title="Histórico de Revisões Realizadas"
            description="Revisões concluídas com data, valor, oficina e tempo de serviço."
            countTable="historico_revisoes"
            filenameBase="historico-revisoes"
            sheetName="Historico"
            headers={HISTORICO_HEADERS}
            fetcher={fetchHistoricoRows}
          />
        </div>
      </div>
    </AppLayout>
  );
}
