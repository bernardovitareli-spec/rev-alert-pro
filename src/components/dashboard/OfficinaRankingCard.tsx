import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOficinaStats } from '@/hooks/useOficinaStats';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Wrench, 
  Clock, 
  DollarSign, 
  Hash,
  Trophy,
  Medal,
  Award,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { formatCurrency } from '@/lib/exportUtils';

function getRankIcon(index: number) {
  switch (index) {
    case 0:
      return <Trophy className="h-4 w-4 text-status-warning" />;
    case 1:
      return <Medal className="h-4 w-4 text-muted-foreground" />;
    case 2:
      return <Award className="h-4 w-4 text-primary" />;
    default:
      return <Hash className="h-4 w-4 text-muted-foreground" />;
  }
}

function getTempoStatus(tempo: number, mediaGeral: number): 'good' | 'neutral' | 'bad' {
  if (tempo <= mediaGeral * 0.8) return 'good';
  if (tempo >= mediaGeral * 1.2) return 'bad';
  return 'neutral';
}

export function OfficinaRankingCard() {
  const { data: oficinas, isLoading } = useOficinaStats();

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular média geral de tempo
  const oficinasComServico = oficinas?.filter(o => o.totalServicos > 0) || [];
  const mediaGeral = oficinasComServico.length > 0
    ? oficinasComServico.reduce((sum, o) => sum + o.tempoMedioDias, 0) / oficinasComServico.length
    : 0;

  // Ordenar por volume de serviços
  const top5 = oficinasComServico.slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-5 w-5 text-primary" />
            Ranking de Mecânicos
          </CardTitle>
          {mediaGeral > 0 && (
            <Badge variant="outline" className="text-xs">
              Média: {mediaGeral.toFixed(1)} dias
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {top5.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <Wrench className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhum mecânico com serviços</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-2">
            <div className="space-y-2">
              {top5.map((oficina, index) => {
                const tempoStatus = getTempoStatus(oficina.tempoMedioDias, mediaGeral);
                
                return (
                  <Link key={oficina.id} to="/oficinas">
                    <div className={cn(
                      "p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:border-primary/30",
                      index === 0 ? "bg-gradient-to-r from-status-warning/10 to-transparent border-status-warning/20" : "bg-card"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getRankIcon(index)}
                          <span className="font-medium text-sm truncate max-w-[140px]">
                            {oficina.nome}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {oficina.totalServicos} serviços
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className={cn(
                            "h-3.5 w-3.5",
                            tempoStatus === 'good' ? "text-status-ok" :
                            tempoStatus === 'bad' ? "text-status-critical" : "text-muted-foreground"
                          )} />
                          <span className={cn(
                            tempoStatus === 'good' ? "text-status-ok" :
                            tempoStatus === 'bad' ? "text-status-critical" : "text-muted-foreground"
                          )}>
                            {oficina.tempoMedioDias} dias
                          </span>
                          {tempoStatus === 'good' && (
                            <TrendingDown className="h-3 w-3 text-status-ok" />
                          )}
                          {tempoStatus === 'bad' && (
                            <TrendingUp className="h-3 w-3 text-status-critical" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground font-medium">
                            {formatCurrency(oficina.totalGasto)}
                          </span>
                        </div>
                      </div>

                      {oficina.totalServicos > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Custo médio: {formatCurrency(oficina.totalGasto / oficina.totalServicos)}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
