import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileDown, 
  FileSpreadsheet, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Car,
  Wrench,
  Settings2,
  Filter,
  X
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFleetAnalytics, useFleetKPIs, useDocumentosVencidos } from '@/hooks/useFleetAnalytics';
import { useEmpresas, useTiposRevisao } from '@/hooks/useFleetData';
import { useOficinas } from '@/hooks/useOficinas';
import { FiltrosRelatorio } from '@/types/fleet';
import { exportToExcel, exportConfigs, formatCurrency, formatDate, formatPercent } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Relatorios() {
  const hoje = new Date();
  const inicioMes = startOfMonth(subMonths(hoje, 2));
  
  const [filtros, setFiltros] = useState<FiltrosRelatorio>({
    dataInicio: format(inicioMes, 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd'),
    empresaId: 'all',
    oficinaId: 'all',
    tipoRevisaoId: 'all',
  });

  const { data: analytics, isLoading: analyticsLoading } = useFleetAnalytics(filtros);
  const { data: kpis, isLoading: kpisLoading } = useFleetKPIs();
  const { data: documentos, isLoading: docsLoading } = useDocumentosVencidos();
  const { data: empresas } = useEmpresas();
  const { data: oficinas } = useOficinas();
  const { data: tiposRevisao } = useTiposRevisao();

  const isLoading = analyticsLoading || kpisLoading || docsLoading;

  const hasActiveFilters = 
    filtros.empresaId !== 'all' ||
    filtros.oficinaId !== 'all' ||
    filtros.tipoRevisaoId !== 'all';

  const clearFilters = () => {
    setFiltros(prev => ({
      ...prev,
      empresaId: 'all',
      oficinaId: 'all',
      tipoRevisaoId: 'all',
    }));
  };

  // Export handlers
  const handleExportGastosPorVeiculo = () => {
    if (analytics?.gastosPorVeiculo) {
      exportToExcel(analytics.gastosPorVeiculo, exportConfigs.gastosPorVeiculo, 'gastos_por_veiculo');
    }
  };

  const handleExportGastosPorOficina = () => {
    if (analytics?.gastosPorOficina) {
      exportToExcel(analytics.gastosPorOficina, exportConfigs.gastosPorOficina, 'gastos_por_oficina');
    }
  };

  const handleExportGastosPorTipo = () => {
    if (analytics?.gastosPorTipo) {
      exportToExcel(analytics.gastosPorTipo, exportConfigs.gastosPorTipo, 'gastos_por_tipo');
    }
  };

  const handleExportHistorico = () => {
    if (analytics?.historico) {
      const dadosExport = analytics.historico.map((h: any) => ({
        data_realizacao: h.data_realizacao,
        veiculoPlaca: h.veiculo?.placa_serie || '-',
        tipoRevisaoNome: h.tipo_revisao?.nome || '-',
        oficinaNome: h.oficina?.nome || '-',
        valor: h.valor,
        ordem_servico: h.ordem_servico,
        kmHoraRealizacao: h.km_realizacao || h.hora_realizacao || '-',
        tempo_servico_dias: h.tempo_servico_dias,
        observacoes: h.observacoes,
      }));
      exportToExcel(dadosExport, exportConfigs.historicoRevisoes, 'historico_revisoes');
    }
  };

  // Prepare chart data
  const chartDataTipos = useMemo(() => {
    return analytics?.gastosPorTipo.slice(0, 5).map(g => ({
      name: g.tipoNome.length > 15 ? g.tipoNome.slice(0, 15) + '...' : g.tipoNome,
      valor: g.totalGasto,
    })) || [];
  }, [analytics]);

  const chartDataOficinas = useMemo(() => {
    return analytics?.gastosPorOficina.slice(0, 5).map(g => ({
      name: g.oficinaNome.length > 12 ? g.oficinaNome.slice(0, 12) + '...' : g.oficinaNome,
      valor: g.totalGasto,
      servicos: g.qtdServicos,
    })) || [];
  }, [analytics]);

  const getTendenciaIcon = () => {
    if (!kpis) return null;
    switch (kpis.tendenciaGasto) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-status-critical" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-status-ok" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Relatórios">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Relatórios">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Relatórios e Analytics</h1>
          <p className="text-muted-foreground">Análise financeira e operacional da frota</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Gasto</p>
                  <p className="text-2xl font-bold">{formatCurrency(kpis?.totalGasto || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary opacity-80" />
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                {getTendenciaIcon()}
                <span className="text-muted-foreground">
                  {formatCurrency(kpis?.gastoMesAtual || 0)} este mês
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revisões Realizadas</p>
                  <p className="text-2xl font-bold">{kpis?.totalRevisoesRealizadas || 0}</p>
                </div>
                <Settings2 className="h-8 w-8 text-primary opacity-80" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Média: {formatCurrency(kpis?.mediaGastoPorRevisao || 0)}/revisão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Médio</p>
                  <p className="text-2xl font-bold">{kpis?.tempoMedioEntrega || 0} dias</p>
                </div>
                <Wrench className="h-8 w-8 text-primary opacity-80" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Para conclusão de serviços
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Docs Vencidos</p>
                  <p className="text-2xl font-bold">{documentos?.totalVencidos || 0}</p>
                </div>
                <Car className="h-8 w-8 text-status-critical opacity-80" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                + {documentos?.totalAtencao || 0} vencendo em 30 dias
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filtros.dataInicio || ''}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filtros.dataFim || ''}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={filtros.empresaId} onValueChange={(v) => setFiltros(prev => ({ ...prev, empresaId: v }))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todas</SelectItem>
                    {empresas?.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Oficina</Label>
                <Select value={filtros.oficinaId} onValueChange={(v) => setFiltros(prev => ({ ...prev, oficinaId: v }))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todas</SelectItem>
                    {oficinas?.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo Revisão</Label>
                <Select value={filtros.tipoRevisaoId} onValueChange={(v) => setFiltros(prev => ({ ...prev, tipoRevisaoId: v }))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todos</SelectItem>
                    {tiposRevisao?.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs with reports */}
        <Tabs defaultValue="veiculos" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="veiculos">Por Veículo</TabsTrigger>
            <TabsTrigger value="oficinas">Por Oficina</TabsTrigger>
            <TabsTrigger value="tipos">Por Tipo</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* Por Veículo */}
          <TabsContent value="veiculos" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Gastos por Veículo
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportGastosPorVeiculo}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                {analytics?.gastosPorVeiculo.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum dado no período</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead className="text-right">Qtd. Revisões</TableHead>
                        <TableHead className="text-right">Total Gasto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.gastosPorVeiculo.map((g) => (
                        <TableRow key={g.veiculoId}>
                          <TableCell className="font-medium">{g.veiculoPlaca}</TableCell>
                          <TableCell className="text-muted-foreground">{g.empresaNome || '-'}</TableCell>
                          <TableCell className="text-right">{g.qtdRevisoes}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(g.totalGasto)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Por Oficina */}
          <TabsContent value="oficinas" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Gastos por Oficina
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleExportGastosPorOficina}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </CardHeader>
                <CardContent>
                  {analytics?.gastosPorOficina.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum dado</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Oficina</TableHead>
                          <TableHead className="text-right">Serviços</TableHead>
                          <TableHead className="text-right">Tempo Médio</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics?.gastosPorOficina.map((g) => (
                          <TableRow key={g.oficinaId}>
                            <TableCell className="font-medium">{g.oficinaNome}</TableCell>
                            <TableCell className="text-right">{g.qtdServicos}</TableCell>
                            <TableCell className="text-right">{g.tempoMedioDias.toFixed(1)} dias</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(g.totalGasto)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Oficina</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartDataOficinas.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum dado</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartDataOficinas}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Total']}
                          contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Por Tipo */}
          <TabsContent value="tipos" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Gastos por Tipo de Revisão
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleExportGastosPorTipo}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </CardHeader>
                <CardContent>
                  {analytics?.gastosPorTipo.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum dado</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo de Revisão</TableHead>
                          <TableHead className="text-right">Qtd.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics?.gastosPorTipo.map((g) => (
                          <TableRow key={g.tipoId}>
                            <TableCell className="font-medium">{g.tipoNome}</TableCell>
                            <TableCell className="text-right">{g.qtdRevisoes}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(g.totalGasto)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartDataTipos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum dado</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartDataTipos}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="valor"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {chartDataTipos.map((entry) => (
                            <Cell key={`cell-tipo-${entry.name}`} fill={COLORS[chartDataTipos.indexOf(entry) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value), 'Total']} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="historico" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Histórico de Revisões Realizadas</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportHistorico}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                {!analytics?.historico || analytics.historico.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum registro no período</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Oficina</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>OS</TableHead>
                          <TableHead className="text-right">Tempo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.historico.slice(0, 50).map((h: any) => (
                          <TableRow key={h.id}>
                            <TableCell>{formatDate(h.data_realizacao)}</TableCell>
                            <TableCell className="font-medium">{h.veiculo?.placa_serie || '-'}</TableCell>
                            <TableCell>{h.tipo_revisao?.nome || '-'}</TableCell>
                            <TableCell>{h.oficina?.nome || '-'}</TableCell>
                            <TableCell className="text-right">{formatCurrency(h.valor)}</TableCell>
                            <TableCell>{h.ordem_servico || '-'}</TableCell>
                            <TableCell className="text-right">{h.tempo_servico_dias ? `${h.tempo_servico_dias}d` : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {analytics.historico.length > 50 && (
                      <p className="text-center text-sm text-muted-foreground mt-4">
                        Mostrando 50 de {analytics.historico.length} registros. Exporte para ver todos.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
