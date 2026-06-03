import { useHistoricoRevisoes } from '@/hooks/useHistoricoRevisoes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Wrench, FileText } from 'lucide-react';

interface VeiculoHistoricoProps {
  veiculoId: string;
  unidade?: 'Km' | 'Hr';
}

export function VeiculoHistorico({ veiculoId }: VeiculoHistoricoProps) {
  const { data: historico, isLoading } = useHistoricoRevisoes(veiculoId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Revisões Realizadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !historico || historico.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma revisão realizada ainda.
          </div>
        ) : (
          <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
            <ul className="space-y-4">
              {historico.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-medium text-sm">
                      {h.tipo_revisao?.nome || 'Revisão'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(h.data_realizacao), "dd 'de' MMM yyyy", { locale: ptBR })}
                    </span>
                    {h.tempo_servico_dias != null && (
                      <Badge variant="outline" className="text-[10px] py-0">
                        {h.tempo_servico_dias} dia{h.tempo_servico_dias !== 1 ? 's' : ''} em serviço
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {h.km_realizacao != null && (
                      <span>{h.km_realizacao.toLocaleString('pt-BR')} km</span>
                    )}
                    {h.hora_realizacao != null && (
                      <span>{h.hora_realizacao.toLocaleString('pt-BR')} h</span>
                    )}
                    {h.oficina?.nome && (
                      <span className="inline-flex items-center gap-1">
                        <Wrench className="h-3 w-3" /> {h.oficina.nome}
                      </span>
                    )}
                    {h.ordem_servico && <span>OS {h.ordem_servico}</span>}
                    {h.valor != null && (
                      <span>R$ {h.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    )}
                    {h.nota_fiscal_url && (
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" /> NF anexada
                      </span>
                    )}
                  </div>
                  {h.observacoes && (
                    <p className="mt-1 text-xs italic text-muted-foreground">{h.observacoes}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
