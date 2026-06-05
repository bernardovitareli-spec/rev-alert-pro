import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Download, FileSpreadsheet } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",;\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function diffDias(later: string | null, earlier: string | null): string {
  if (!earlier) return '';
  const end = later ? new Date(later) : new Date();
  const start = new Date(earlier);
  const ms = end.getTime() - start.getTime();
  if (isNaN(ms)) return '';
  return String(Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function fmtDate(d: string | null): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('pt-BR');
}

export default function AdminExportarOrdens() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const [exporting, setExporting] = useState(false);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 text-muted-foreground">Carregando...</div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          veiculo:veiculos(placa_serie, tag_obra, empresa:empresas(nome)),
          tipo_revisao:tipos_revisao(nome),
          avarias_fotos(count)
        `)
        .order('data_entrada', { ascending: false });

      if (error) throw error;

      const rows = data ?? [];

      const headers = [
        'Placa',
        'Tag da Obra',
        'Empresa',
        'Tipo de Manutenção',
        'Subcategoria Corretiva',
        'Tipo de Revisão Preventiva',
        'Detalhamento',
        'Data de Entrada',
        'KM de Entrada',
        'Horímetro de Entrada',
        'Tem Avarias',
        'Descrição das Avarias',
        'Previsão de Saída',
        'Data de Saída',
        'KM de Saída',
        'Horímetro de Saída',
        'Avarias Resolvidas',
        'Observações de Saída',
        'Status',
        'Dias em Oficina',
        'Dias de Atraso na Previsão',
        'Qtd. Fotos de Avaria',
      ];

      const lines = [headers.map(csvEscape).join(';')];

      for (const r of rows as any[]) {
        const fotosCount = Array.isArray(r.avarias_fotos) && r.avarias_fotos.length > 0
          ? (r.avarias_fotos[0]?.count ?? 0)
          : 0;

        const diasOficina = diffDias(r.data_saida, r.data_entrada);
        const diasAtraso = r.data_saida && r.previsao_saida
          ? diffDias(r.data_saida, r.previsao_saida)
          : '';

        const row = [
          r.veiculo?.placa_serie ?? '',
          r.veiculo?.tag_obra ?? '',
          r.veiculo?.empresa?.nome ?? '',
          r.tipo_manutencao ?? '',
          r.subcategoria_corretiva ?? '',
          r.tipo_revisao?.nome ?? '',
          r.detalhamento ?? '',
          fmtDate(r.data_entrada),
          r.km_entrada ?? '',
          r.horimetro_entrada ?? '',
          r.tem_avarias ? 'Sim' : 'Não',
          r.descricao_avarias ?? '',
          fmtDate(r.previsao_saida),
          fmtDate(r.data_saida),
          r.km_saida ?? '',
          r.horimetro_saida ?? '',
          r.avarias_resolvidas === null || r.avarias_resolvidas === undefined
            ? ''
            : (r.avarias_resolvidas ? 'Sim' : 'Não'),
          r.observacoes_saida ?? '',
          r.status ?? '',
          diasOficina,
          diasAtraso,
          fotosCount,
        ];
        lines.push(row.map(csvEscape).join(';'));
      }

      const csv = '\ufeff' + lines.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `controle-entrada-saida_${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${rows.length} ordens exportadas com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao exportar: ' + (err.message ?? 'Erro desconhecido'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Exportar Dados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Faça o download completo das ordens de serviço em formato CSV.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Ordens de Serviço</CardTitle>
                <CardDescription>
                  Exporta todas as entradas e saídas com cálculos de dias em oficina e atrasos.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={exporting} size="lg" className="gap-2">
              <Download className="h-4 w-4" />
              {exporting ? 'Gerando CSV...' : 'Baixar CSV de Ordens de Serviço'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
