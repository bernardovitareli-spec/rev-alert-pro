import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useForecast, useDocumentForecast } from '@/hooks/useForecast';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  TrendingUp,
  Clock,
  FileWarning,
  AlertTriangle,
  Wallet
} from 'lucide-react';
import { formatCurrency } from '@/lib/exportUtils';

function ForecastPeriod({ 
  label, 
  dias,
  quantidade, 
  custoEstimado,
  isHighlight 
}: { 
  label: string;
  dias: number;
  quantidade: number; 
  custoEstimado: number;
  isHighlight?: boolean;
}) {
  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all duration-200",
      isHighlight 
        ? "bg-gradient-to-r from-primary/10 to-transparent border-primary/20" 
        : "bg-muted/30"
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Badge variant={isHighlight ? "default" : "secondary"} className="text-xs">
          {dias} dias
        </Badge>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn(
          "text-2xl font-bold",
          isHighlight && "text-primary"
        )}>
          {quantidade}
        </span>
        <span className="text-xs text-muted-foreground">revisões</span>
      </div>
      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
        <Wallet className="h-3 w-3" />
        <span>Estimado: {formatCurrency(custoEstimado)}</span>
      </div>
    </div>
  );
}

export function ForecastCard() {
  const { data: forecast, isLoading: loadingForecast } = useForecast();
  const { data: docForecast, isLoading: loadingDocs } = useDocumentForecast();

  const isLoading = loadingForecast || loadingDocs;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  const hasUrgentDemand = (forecast?.proximaSemana || 0) >= 5;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Previsão de Demanda
          </CardTitle>
          {hasUrgentDemand && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Alta demanda
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Previsão de Revisões */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Revisões Previstas</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ForecastPeriod
              label="Próximos"
              dias={30}
              quantidade={forecast?.periodo30.quantidade || 0}
              custoEstimado={forecast?.periodo30.custoEstimado || 0}
              isHighlight
            />
            <ForecastPeriod
              label="Em até"
              dias={60}
              quantidade={forecast?.periodo60.quantidade || 0}
              custoEstimado={forecast?.periodo60.custoEstimado || 0}
            />
            <ForecastPeriod
              label="Em até"
              dias={90}
              quantidade={forecast?.periodo90.quantidade || 0}
              custoEstimado={forecast?.periodo90.custoEstimado || 0}
            />
          </div>
        </div>

        {/* Previsão de Documentos */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileWarning className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Documentos Vencendo</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className={cn(
              "p-2 rounded-lg text-center",
              (docForecast?.vencidos || 0) > 0 
                ? "bg-status-critical/10 border border-status-critical/20" 
                : "bg-muted/30"
            )}>
              <span className={cn(
                "text-lg font-bold block",
                (docForecast?.vencidos || 0) > 0 && "text-status-critical"
              )}>
                {docForecast?.vencidos || 0}
              </span>
              <span className="text-xs text-muted-foreground">Vencidos</span>
            </div>
            <div className="p-2 rounded-lg bg-status-warning/10 border border-status-warning/20 text-center">
              <span className="text-lg font-bold text-status-warning block">
                {docForecast?.vencendo30 || 0}
              </span>
              <span className="text-xs text-muted-foreground">30 dias</span>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <span className="text-lg font-bold block">
                {docForecast?.vencendo60 || 0}
              </span>
              <span className="text-xs text-muted-foreground">60 dias</span>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <span className="text-lg font-bold block">
                {docForecast?.vencendo90 || 0}
              </span>
              <span className="text-xs text-muted-foreground">90 dias</span>
            </div>
          </div>
        </div>

        {/* Picos da Semana */}
        {forecast?.picosSemana && forecast.picosSemana.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Dias com Mais Demanda</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {forecast.picosSemana.slice(0, 3).map((pico, idx) => (
                <Badge 
                  key={pico.dia} 
                  variant={idx === 0 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {pico.dia}: {pico.quantidade}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
