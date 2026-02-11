import { useDashboardStats } from '@/hooks/useFleetData';
import { StatusCard } from './StatusCard';
import { AlertTriangle, Clock, CheckCircle2, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatsOverview() {
  const { data: stats, isLoading } = useDashboardStats();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Main status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          title="Revisões Vencidas"
          value={stats.veiculosCriticos}
          subtitle={`${stats.revisoesCriticas} revisões`}
          status="critical"
          icon={<AlertTriangle className="h-8 w-8" />}
          onClick={() => navigate('/veiculos?status=critical')}
        />
        <StatusCard
          title="Atenção (7 dias)"
          value={stats.veiculosAtencao}
          subtitle={`${stats.revisoesAtencao} revisões`}
          status="warning"
          icon={<Clock className="h-8 w-8" />}
          onClick={() => navigate('/veiculos?status=warning')}
        />
        <StatusCard
          title="Em Dia"
          value={stats.veiculosOk}
          subtitle={`${stats.revisoesOk} revisões`}
          status="ok"
          icon={<CheckCircle2 className="h-8 w-8" />}
          onClick={() => navigate('/veiculos?status=ok')}
        />
      </div>

      {/* Total vehicles card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Resumo da Frota
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-3xl font-bold text-foreground">{stats.totalVeiculos}</p>
              <p className="text-sm text-muted-foreground">Total de Veículos</p>
            </div>
            <div className="p-4 rounded-lg bg-status-critical/10">
              <p className="text-3xl font-bold text-status-critical">{stats.revisoesCriticas}</p>
              <p className="text-sm text-muted-foreground">Revisões Vencidas</p>
            </div>
            <div className="p-4 rounded-lg bg-status-warning/10">
              <p className="text-3xl font-bold text-status-warning">{stats.revisoesAtencao}</p>
              <p className="text-sm text-muted-foreground">Próximos 7 Dias</p>
            </div>
            <div className="p-4 rounded-lg bg-status-ok/10">
              <p className="text-3xl font-bold text-status-ok">{stats.revisoesOk}</p>
              <p className="text-sm text-muted-foreground">Em Dia</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
