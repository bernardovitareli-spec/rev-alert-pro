import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDocumentosVencidos } from '@/hooks/useFleetAnalytics';
import { FileWarning, AlertCircle, AlertTriangle, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function DocumentosVencidosCard() {
  const { data, isLoading } = useDocumentosVencidos();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    );
  }

  const { vencidos, atencao, totalVencidos, totalAtencao } = data || { vencidos: [], atencao: [], totalVencidos: 0, totalAtencao: 0 };

  const allDocs = [...vencidos, ...atencao].slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <FileWarning className="h-5 w-5" />
            Documentos
          </span>
          <div className="flex gap-2">
            {totalVencidos > 0 && (
              <Badge variant="destructive" className="text-xs">
                {totalVencidos} vencido{totalVencidos > 1 ? 's' : ''}
              </Badge>
            )}
            {totalAtencao > 0 && (
              <Badge variant="outline" className="text-xs bg-status-warning/10 text-status-warning border-status-warning">
                {totalAtencao} atenção
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allDocs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileWarning className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Todos os documentos em dia!</p>
          </div>
        ) : (
          <ScrollArea className="h-[180px]">
            <div className="space-y-2">
              {allDocs.map((doc) => {
                const isCrlvIssue = doc.crlv.status === 'vencido' || doc.crlv.status === 'atencao';
                const isTacoIssue = doc.tacografo.status === 'vencido' || doc.tacografo.status === 'atencao';
                
                return (
                  <Link
                    key={doc.veiculoId}
                    to={`/veiculos/${doc.veiculoId}`}
                    className="block p-2 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Car className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">{doc.veiculoPlaca}</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {isCrlvIssue && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs gap-1",
                              doc.crlv.status === 'vencido' 
                                ? 'bg-status-critical/10 text-status-critical border-status-critical' 
                                : 'bg-status-warning/10 text-status-warning border-status-warning'
                            )}
                          >
                            {doc.crlv.status === 'vencido' ? <AlertCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            CRLV
                          </Badge>
                        )}
                        {isTacoIssue && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs gap-1",
                              doc.tacografo.status === 'vencido' 
                                ? 'bg-status-critical/10 text-status-critical border-status-critical' 
                                : 'bg-status-warning/10 text-status-warning border-status-warning'
                            )}
                          >
                            {doc.tacografo.status === 'vencido' ? <AlertCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            Taco
                          </Badge>
                        )}
                      </div>
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
