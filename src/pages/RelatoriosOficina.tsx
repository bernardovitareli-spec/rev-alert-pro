import { useState, useMemo, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { BarChart3, Download, FileText, AlertTriangle, Wrench, Clock, ClipboardList, Calendar } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useEmpresas } from '@/hooks/useFleetData';
import { useOficinaRelatorio, OficinaRelatorioFiltros } from '@/hooks/useOficinaRelatorio';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import { formatDateSafe } from '@/components/controle-entrada-saida/constants';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

type PresetPeriodo = '30' | '60' | '90' | 'custom';

function fmtDays(v: number) {
  return `${v.toFixed(1)} d`;
}
function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

export default function RelatoriosOficina() {
  const reportRef = useRef<HTMLDivElement>(null);
  const hoje = new Date();
  const [preset, setPreset] = useState<PresetPeriodo>('30');
  const [filtros, setFiltros] = useState<OficinaRelatorioFiltros>({
    dataInicio: format(subDays(hoje, 30), 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd'),
    empresaId: 'all',
  });

  const { data: empresas } = useEmpresas();
  const { data, isLoading } = useOficinaRelatorio(filtros);

  const handlePreset = (v: PresetPeriodo) => {
    setPreset(v);
    if (v !== 'custom') {
      const dias = parseInt(v, 10);
      setFiltros((f) => ({
        ...f,
        dataInicio: format(subDays(new Date(), dias), 'yyyy-MM-dd'),
        dataFim: format(new Date(), 'yyyy-MM-dd'),
      }));
    }
  };

  const handleExportExcel = async () => {
    if (!data) return;
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const kpisSheet = XLSX.utils.aoa_to_sheet([
        ['Indicador', 'Valor'],
        ['Período', `${formatDateSafe(filtros.dataInicio)} - ${formatDateSafe(filtros.dataFim)}`],
        ['Empresa', filtros.empresaId === 'all' ? 'Todas' : (empresas?.find(e => e.id === filtros.empresaId)?.nome ?? '-')],
        ['Total de Ordens', data.kpis.totalOrdens],
        ['Média de equipamentos/dia', data.kpis.mediaPorDia.toFixed(2)],
        ['Tempo médio de liberação (dias)', data.kpis.tempoMedio.toFixed(2)],
        ['% Entradas com Avaria', `${data.kpis.percAvaria.toFixed(2)}%`],
      ]);
      XLSX.utils.book_append_sheet(wb, kpisSheet, 'KPIs');

      const distSheet = XLSX.utils.json_to_sheet(
        data.distribuicaoTipo.map((d) => ({ Tipo: d.name, Quantidade: d.value, Percentual: d.pct.toFixed(2) + '%' }))
      );
      XLSX.utils.book_append_sheet(wb, distSheet, 'Distribuicao Tipo');

      const subSheet = XLSX.utils.json_to_sheet(
        data.corretivasPorSub.map((d) => ({
          Subcategoria: d.subcategoria, Quantidade: d.qtd,
          'Tempo Médio (d)': d.tempoMedio.toFixed(2),
          'Tempo Máximo (d)': d.tempoMax,
        }))
      );
      XLSX.utils.book_append_sheet(wb, subSheet, 'Corretivas Subcat');

      const prevSheet = XLSX.utils.json_to_sheet(
        data.preventivasPorTipo.map((d) => ({
          'Tipo Revisão': d.tipo, Quantidade: d.qtd,
          'Tempo Médio (d)': d.tempoMedio.toFixed(2),
          'Mediana (d)': d.mediana.toFixed(2),
        }))
      );
      XLSX.utils.book_append_sheet(wb, prevSheet, 'Preventivas Tipo');

      const empSheet = XLSX.utils.json_to_sheet(
        data.atendimentosPorEmpresa.map((d) => ({
          Empresa: d.empresa, Total: d.total, Corretivas: d.corretivas,
          Preventivas: d.preventivas, 'Em Aberto': d.emAberto,
          'Tempo Médio (d)': d.tempoMedio.toFixed(2),
          '% Avaria': d.percAvaria.toFixed(2) + '%',
        }))
      );
      XLSX.utils.book_append_sheet(wb, empSheet, 'Por Empresa');

      const reincSheet = XLSX.utils.json_to_sheet(
        data.reincidencias.map((d) => ({
          Placa: d.placa, Empresa: d.empresa, Tipo: d.tipoManutencao,
          Subcategoria: d.subcategoria, 'Qtd Retornos': d.qtdRetornos,
          'Intervalo Médio (d)': d.intervaloMedio.toFixed(2),
          'Tempo Médio Liberação (d)': d.tempoMedioLib.toFixed(2),
        }))
      );
      XLSX.utils.book_append_sheet(wb, reincSheet, 'Reincidencias');

      const abertSheet = XLSX.utils.json_to_sheet(
        data.ordensAbertas.map((d) => ({
          Placa: d.placa, Empresa: d.empresa, Tipo: d.tipo,
          'Data Entrada': formatDateSafe(d.dataEntrada),
          'Dias em Oficina': d.diasEmOficina,
        }))
      );
      XLSX.utils.book_append_sheet(wb, abertSheet, 'Em Aberto');

      XLSX.writeFile(wb, `relatorio-oficina_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
      toast.success('Excel exportado');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao exportar Excel');
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const jsPDF = (await import('jspdf')).default;
      toast.loading('Gerando PDF...', { id: 'pdf' });
      const dataUrl = await toPng(reportRef.current, { pixelRatio: 2, backgroundColor: '#0B1121' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = res; });
      const ratio = img.width / img.height;
      let w = pw - 24;
      let h = w / ratio;
      if (h > ph - 24) { h = ph - 24; w = h * ratio; }
      pdf.addImage(dataUrl, 'PNG', (pw - w) / 2, 12, w, h);
      pdf.save(`relatorio-oficina_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
      toast.success('PDF exportado', { id: 'pdf' });
    } catch (e) {
      console.error(e);
      toast.error('Falha ao exportar PDF', { id: 'pdf' });
    }
  };

  const empresaNome = useMemo(() => {
    if (filtros.empresaId === 'all') return 'Todas as empresas';
    return empresas?.find((e) => e.id === filtros.empresaId)?.nome ?? '-';
  }, [filtros.empresaId, empresas]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/12">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Relatórios da Oficina</h1>
              <p className="text-sm text-muted-foreground">Indicadores em tempo real do controle de entrada/saída</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel} disabled={!data}>
              <Download className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF} disabled={!data}>
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Período</label>
                <Select value={preset} onValueChange={(v) => handlePreset(v as PresetPeriodo)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="60">Últimos 60 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data Início</label>
                <input
                  type="date"
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={filtros.dataInicio}
                  onChange={(e) => { setPreset('custom'); setFiltros((f) => ({ ...f, dataInicio: e.target.value })); }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data Fim</label>
                <input
                  type="date"
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={filtros.dataFim}
                  onChange={(e) => { setPreset('custom'); setFiltros((f) => ({ ...f, dataFim: e.target.value })); }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Empresa</label>
                <Select value={filtros.empresaId} onValueChange={(v) => setFiltros((f) => ({ ...f, empresaId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {empresas?.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div ref={reportRef} className="space-y-6 bg-background p-2">
          <div className="text-xs text-muted-foreground">
            Período: {formatDateSafe(filtros.dataInicio)} - {formatDateSafe(filtros.dataFim)} · {empresaNome}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {isLoading || !data ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
            ) : (
              <>
                <KpiCard icon={ClipboardList} label="Total de Ordens" value={data.kpis.totalOrdens.toString()} />
                <KpiCard icon={Calendar} label="Média Equip./Dia" value={data.kpis.mediaPorDia.toFixed(1)} />
                <KpiCard icon={Clock} label="Tempo Médio Liberação" value={fmtDays(data.kpis.tempoMedio)} />
                <KpiCard icon={AlertTriangle} label="% Entradas c/ Avaria" value={fmtPct(data.kpis.percAvaria)} />
              </>
            )}
          </div>

          {isLoading || !data ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* A - Distribuição */}
              <Card>
                <CardHeader><CardTitle className="text-base">Distribuição por Tipo de Manutenção</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.distribuicaoTipo} dataKey="value" nameKey="name" outerRadius={90} label={(e: any) => `${e.name}: ${e.value} (${e.pct.toFixed(0)}%)`}>
                        {data.distribuicaoTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* B - Corretivas por subcategoria */}
              <Card>
                <CardHeader><CardTitle className="text-base">Corretivas por Subcategoria</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.corretivasPorSub} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="subcategoria" type="category" width={100} />
                      <RTooltip />
                      <Bar dataKey="qtd" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subcategoria</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">T. Médio</TableHead>
                        <TableHead className="text-right">T. Máx</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.corretivasPorSub.map((s) => (
                        <TableRow key={s.subKey}>
                          <TableCell>{s.subcategoria}</TableCell>
                          <TableCell className="text-right">{s.qtd}</TableCell>
                          <TableCell className="text-right">{fmtDays(s.tempoMedio)}</TableCell>
                          <TableCell className="text-right">{s.tempoMax} d</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* C - Preventivas por tipo */}
              <Card>
                <CardHeader><CardTitle className="text-base">Preventivas por Tipo de Revisão</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-h-[360px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">T. Médio</TableHead>
                          <TableHead className="text-right">Mediana</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.preventivasPorTipo.length === 0 && (
                          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                        )}
                        {data.preventivasPorTipo.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell>{p.tipo}</TableCell>
                            <TableCell className="text-right">{p.qtd}</TableCell>
                            <TableCell className="text-right">{fmtDays(p.tempoMedio)}</TableCell>
                            <TableCell className="text-right">{fmtDays(p.mediana)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* D - Por empresa */}
              <Card>
                <CardHeader><CardTitle className="text-base">Atendimentos por Empresa</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-h-[360px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Corr.</TableHead>
                          <TableHead className="text-right">Prev.</TableHead>
                          <TableHead className="text-right">Aberto</TableHead>
                          <TableHead className="text-right">T. Médio</TableHead>
                          <TableHead className="text-right">% Avaria</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.atendimentosPorEmpresa.length === 0 && (
                          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                        )}
                        {data.atendimentosPorEmpresa.map((e, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{e.empresa}</TableCell>
                            <TableCell className="text-right">{e.total}</TableCell>
                            <TableCell className="text-right">{e.corretivas}</TableCell>
                            <TableCell className="text-right">{e.preventivas}</TableCell>
                            <TableCell className="text-right">{e.emAberto}</TableCell>
                            <TableCell className="text-right">{fmtDays(e.tempoMedio)}</TableCell>
                            <TableCell className="text-right">{fmtPct(e.percAvaria)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* E - Reincidências */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" /> Reincidências (2+ retornos)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[360px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Placa</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Subcategoria/Revisão</TableHead>
                          <TableHead className="text-right">Retornos</TableHead>
                          <TableHead className="text-right">Interv. Médio</TableHead>
                          <TableHead className="text-right">T. Médio Lib.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.reincidencias.length === 0 && (
                          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma reincidência no período</TableCell></TableRow>
                        )}
                        {data.reincidencias.map((r, i) => (
                          <TableRow key={i} className={r.qtdRetornos >= 3 ? 'bg-destructive/10 hover:bg-destructive/15' : ''}>
                            <TableCell className="font-medium">{r.placa}</TableCell>
                            <TableCell>{r.empresa}</TableCell>
                            <TableCell className="capitalize">{r.tipoManutencao}</TableCell>
                            <TableCell>{r.subcategoria}</TableCell>
                            <TableCell className="text-right">
                              {r.qtdRetornos >= 3 ? (
                                <Badge variant="destructive">{r.qtdRetornos}</Badge>
                              ) : r.qtdRetornos}
                            </TableCell>
                            <TableCell className="text-right">{fmtDays(r.intervaloMedio)}</TableCell>
                            <TableCell className="text-right">{fmtDays(r.tempoMedioLib)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* F - Em Aberto */}
              <Card>
                <CardHeader><CardTitle className="text-base">Ordens em Aberto</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-h-[320px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Placa</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Entrada</TableHead>
                          <TableHead className="text-right">Dias</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.ordensAbertas.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma em aberto</TableCell></TableRow>
                        )}
                        {data.ordensAbertas.map((o, i) => (
                          <TableRow key={i} className={o.diasEmOficina > 5 ? 'bg-destructive/10' : ''}>
                            <TableCell className="font-medium">{o.placa}</TableCell>
                            <TableCell>{o.empresa}</TableCell>
                            <TableCell className="capitalize">{o.tipo}</TableCell>
                            <TableCell>{formatDateSafe(o.dataEntrada)}</TableCell>
                            <TableCell className="text-right">
                              {o.diasEmOficina > 5 ? <Badge variant="destructive">{o.diasEmOficina}</Badge> : o.diasEmOficina}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* G - Tempo por subcategoria */}
              <Card>
                <CardHeader><CardTitle className="text-base">Tempo de Liberação por Subcategoria</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subcategoria</TableHead>
                        <TableHead className="text-right">Média</TableHead>
                        <TableHead className="text-right">Mediana</TableHead>
                        <TableHead className="text-right">Máximo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.corretivasPorSub.map((s) => (
                        <TableRow key={s.subKey}>
                          <TableCell>{s.subcategoria}</TableCell>
                          <TableCell className="text-right">{fmtDays(s.tempoMedio)}</TableCell>
                          <TableCell className="text-right">{fmtDays(s.tempoMediano)}</TableCell>
                          <TableCell className="text-right">{s.tempoMax} d</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* H - Avarias */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Avarias na Entrada</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MiniStat label="% com avaria" value={fmtPct(data.avarias.perc)} />
                  <MiniStat label="Total com avaria" value={data.avarias.total.toString()} />
                  <MiniStat label="Resolvidas" value={data.avarias.resolvidas.toString()} tone="ok" />
                  <MiniStat label="Não Resolvidas" value={data.avarias.naoResolvidas.toString()} tone="bad" />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/12">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
  const color = tone === 'ok' ? 'text-emerald-500' : tone === 'bad' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
