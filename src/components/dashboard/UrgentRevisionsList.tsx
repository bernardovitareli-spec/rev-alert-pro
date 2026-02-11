import { useVeiculosComRevisoes } from '@/hooks/useFleetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatarKmOuHora, getStatusLabel } from '@/lib/revisionCalculations';
import { cn } from '@/lib/utils';

export function UrgentRevisionsList() {
  const { data: veiculos, isLoading } = useVeiculosComRevisoes();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-critical" />
            Revisões Urgentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get vehicles with critical or warning status, limited to 10
  const urgentVehicles = veiculos
    ?.filter(v => v.statusGeral === 'critical' || v.statusGeral === 'warning')
    .slice(0, 10) || [];

  if (urgentVehicles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-status-ok" />
            Revisões Urgentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg">🎉 Parabéns!</p>
            <p>Nenhuma revisão urgente no momento.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-status-critical" />
          Revisões Urgentes
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/veiculos?status=critical')}
        >
          Ver todos
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {urgentVehicles.map((veiculo) => {
            // Get the most urgent revision
            const urgentRevision = veiculo.revisoes
              .filter(r => r.status === 'critical' || r.status === 'warning')
              .sort((a, b) => a.faltam - b.faltam)[0];

            if (!urgentRevision) return null;

            return (
              <div 
                key={veiculo.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50',
                  veiculo.statusGeral === 'critical' && 'border-status-critical/30 bg-status-critical/5',
                  veiculo.statusGeral === 'warning' && 'border-status-warning/30 bg-status-warning/5'
                )}
                onClick={() => navigate(`/veiculos/${veiculo.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{veiculo.placa_serie}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        veiculo.statusGeral === 'critical' && 'status-badge-critical',
                        veiculo.statusGeral === 'warning' && 'status-badge-warning'
                      )}
                    >
                      {getStatusLabel(veiculo.statusGeral)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {urgentRevision.tipo_revisao?.nome || 'Revisão'} • 
                    {urgentRevision.faltam <= 0 
                      ? ` Vencida há ${formatarKmOuHora(Math.abs(urgentRevision.faltam), urgentRevision.unidade)}`
                      : ` Faltam ${formatarKmOuHora(urgentRevision.faltam, urgentRevision.unidade)}`
                    }
                  </p>
                </div>
                <div className="text-right">
                  {veiculo.revisoesCriticas > 0 && (
                    <span className="text-sm font-medium text-status-critical">
                      {veiculo.revisoesCriticas} vencida{veiculo.revisoesCriticas > 1 ? 's' : ''}
                    </span>
                  )}
                  {veiculo.revisoesAtencao > 0 && veiculo.revisoesCriticas === 0 && (
                    <span className="text-sm font-medium text-status-warning">
                      {veiculo.revisoesAtencao} atenção
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
