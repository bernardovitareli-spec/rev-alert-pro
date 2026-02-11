import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFleetAvailability } from '@/hooks/useFleetInsights';
import { cn } from '@/lib/utils';
import { 
  Truck, 
  Wrench,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const META_DISPONIBILIDADE = 85;

export function FleetAvailabilityCard() {
  const { data, isLoading } = useFleetAvailability();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  const percentual = data?.percentualDisponivel || 100;
  const abaixoMeta = percentual < META_DISPONIBILIDADE;

  return (
    <Card className={cn(
      "transition-all duration-300",
      abaixoMeta && "border-status-critical/30 bg-gradient-to-r from-status-critical/5 to-transparent"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-5 w-5 text-primary" />
            Disponibilidade da Frota
          </CardTitle>
          <Badge 
            variant={abaixoMeta ? "destructive" : "secondary"}
            className="text-xs"
          >
            Meta: {META_DISPONIBILIDADE}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "text-4xl font-bold",
              abaixoMeta ? "text-status-critical" : "text-status-ok"
            )}>
              {percentual.toFixed(0)}%
            </div>
            {abaixoMeta ? (
              <AlertTriangle className="h-6 w-6 text-status-critical animate-pulse" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-status-ok" />
            )}
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center gap-1 justify-end">
              <CheckCircle2 className="h-3.5 w-3.5 text-status-ok" />
              <span>{data?.disponivel || 0} disponíveis</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <Wrench className="h-3.5 w-3.5 text-status-warning" />
              <span>{data?.emServico || 0} em serviço</span>
            </div>
          </div>
        </div>
        
        <Progress 
          value={percentual} 
          className={cn(
            "h-3",
            abaixoMeta && "[&>div]:bg-status-critical"
          )}
        />
        
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>0%</span>
          <span className="text-primary font-medium">{META_DISPONIBILIDADE}% meta</span>
          <span>100%</span>
        </div>
      </CardContent>
    </Card>
  );
}
