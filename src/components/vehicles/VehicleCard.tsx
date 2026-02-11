import { VeiculoComRevisoes, ExecutionStatus } from '@/types/fleet';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatarKmOuHora, getStatusLabel } from '@/lib/revisionCalculations';
import { getPrevisaoLabel, getPrevisaoColor } from '@/hooks/useDeliveryStats';
import { cn } from '@/lib/utils';
import { Truck, ChevronRight, AlertTriangle, Clock, CheckCircle2, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VehicleCardProps {
  veiculo: VeiculoComRevisoes;
  showDeliveryInfo?: boolean;
}

export function VehicleCard({ veiculo, showDeliveryInfo = false }: VehicleCardProps) {
  const navigate = useNavigate();

  // Get the earliest delivery date from em_servico revisions
  const emServicoRevisoes = veiculo.revisoes.filter(r => r.status_execucao === 'em_servico');
  const earliestDelivery = emServicoRevisoes
    .filter(r => r.previsao_entrega)
    .sort((a, b) => (a.previsao_entrega || '').localeCompare(b.previsao_entrega || ''))[0];

  const statusIcon = {
    critical: <AlertTriangle className="h-5 w-5" />,
    warning: <Clock className="h-5 w-5" />,
    ok: <CheckCircle2 className="h-5 w-5" />,
  };

  const statusBorderClass = {
    critical: 'border-l-4 border-l-status-critical',
    warning: 'border-l-4 border-l-status-warning',
    ok: 'border-l-4 border-l-status-ok',
  };

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        statusBorderClass[veiculo.statusGeral]
      )}
      onClick={() => navigate(`/veiculos/${veiculo.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              veiculo.statusGeral === 'critical' && 'bg-status-critical/10 text-status-critical',
              veiculo.statusGeral === 'warning' && 'bg-status-warning/10 text-status-warning',
              veiculo.statusGeral === 'ok' && 'bg-status-ok/10 text-status-ok'
            )}>
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{veiculo.placa_serie}</h3>
              {veiculo.tag_obra && (
                <p className="text-sm text-muted-foreground">{veiculo.tag_obra}</p>
              )}
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              'flex items-center gap-1',
              veiculo.statusGeral === 'critical' && 'status-badge-critical',
              veiculo.statusGeral === 'warning' && 'status-badge-warning',
              veiculo.statusGeral === 'ok' && 'status-badge-ok'
            )}
          >
            {statusIcon[veiculo.statusGeral]}
            {getStatusLabel(veiculo.statusGeral)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* KM and Hours */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">KM Atual:</span>
              <span className="ml-2 font-medium">{veiculo.km_atual.toLocaleString('pt-BR')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Horímetro:</span>
              <span className="ml-2 font-medium">{veiculo.hora_atual.toLocaleString('pt-BR')}h</span>
            </div>
          </div>

          {/* Empresa */}
          {veiculo.empresa && (
            <div className="text-sm">
              <span className="text-muted-foreground">Empresa:</span>
              <span className="ml-2 font-medium">{veiculo.empresa.nome}</span>
            </div>
          )}

          {/* Delivery info when in service filter is active */}
          {showDeliveryInfo && emServicoRevisoes.length > 0 && (
            <div className="flex items-center gap-2 text-sm bg-purple-500/10 rounded-md p-2">
              <Wrench className="h-4 w-4 text-purple-600" />
              <div className="flex-1">
                <span className="text-muted-foreground">Em Serviço:</span>
                <span className="ml-1 font-medium">{emServicoRevisoes.length} revisão(ões)</span>
              </div>
              {earliestDelivery && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs',
                    getPrevisaoColor(earliestDelivery.previsao_entrega)
                  )}
                >
                  {getPrevisaoLabel(earliestDelivery.previsao_entrega)}
                </Badge>
              )}
            </div>
          )}

          {/* Revision summary */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {veiculo.revisoesCriticas > 0 && (
              <Badge variant="secondary" className="bg-status-critical/10 text-status-critical border-0">
                {veiculo.revisoesCriticas} vencida{veiculo.revisoesCriticas > 1 ? 's' : ''}
              </Badge>
            )}
            {veiculo.revisoesAtencao > 0 && (
              <Badge variant="secondary" className="bg-status-warning/10 text-status-warning border-0">
                {veiculo.revisoesAtencao} atenção
              </Badge>
            )}
            {veiculo.revisoesOk > 0 && (
              <Badge variant="secondary" className="bg-status-ok/10 text-status-ok border-0">
                {veiculo.revisoesOk} ok
              </Badge>
            )}
            <div className="flex-1" />
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
