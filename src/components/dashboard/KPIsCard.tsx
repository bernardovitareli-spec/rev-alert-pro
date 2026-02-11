import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFleetKPIs } from '@/hooks/useFleetAnalytics';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  FileWarning,
  BarChart3
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';

export function KPIsCard() {
  const { data: kpis, isLoading } = useFleetKPIs();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTendenciaIcon = () => {
    switch (kpis?.tendenciaGasto) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-status-critical" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-status-ok" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTendenciaLabel = () => {
    if (!kpis?.gastoMesAnterior || kpis.gastoMesAnterior === 0) return 'Sem dados anterior';
    const diff = ((kpis.gastoMesAtual - kpis.gastoMesAnterior) / kpis.gastoMesAnterior) * 100;
    if (diff > 0) return `+${diff.toFixed(0)}% vs mês anterior`;
    if (diff < 0) return `${diff.toFixed(0)}% vs mês anterior`;
    return 'Estável';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5" />
          KPIs Financeiros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Gasto Mês Atual */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Este Mês</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(kpis?.gastoMesAtual || 0)}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getTendenciaIcon()}
              <span>{getTendenciaLabel()}</span>
            </div>
          </div>

          {/* Média por Revisão */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Média/Revisão</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(kpis?.mediaGastoPorRevisao || 0)}</p>
            <p className="text-xs text-muted-foreground">
              {kpis?.totalRevisoesRealizadas || 0} revisões realizadas
            </p>
          </div>

          {/* Tempo Médio */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Tempo Médio</span>
            </div>
            <p className="text-lg font-bold">{kpis?.tempoMedioEntrega || 0} dias</p>
            <p className="text-xs text-muted-foreground">Para conclusão</p>
          </div>

          {/* Documentos */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileWarning className={cn(
                "h-4 w-4",
                (kpis?.percentualDocumentosVencidos || 0) > 0 ? 'text-status-critical' : 'text-primary'
              )} />
              <span className="text-xs text-muted-foreground">Docs Vencidos</span>
            </div>
            <p className={cn(
              "text-lg font-bold",
              (kpis?.percentualDocumentosVencidos || 0) > 0 && 'text-status-critical'
            )}>
              {formatPercent(kpis?.percentualDocumentosVencidos || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              + {formatPercent(kpis?.percentualDocumentosAtencao || 0)} atenção
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
