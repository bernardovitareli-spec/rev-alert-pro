import { VeiculoComRevisoes, ExecutionStatus } from '@/types/fleet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatarKmOuHora } from '@/lib/revisionCalculations';
import { StatusExecucaoSelect } from '@/components/revisions/StatusExecucaoSelect';
import { PrevisaoEntregaInput } from '@/components/revisions/PrevisaoEntregaInput';
import { OficinaSelect } from '@/components/revisions/OficinaSelect';
import { OrdemServicoInput } from '@/components/revisions/OrdemServicoInput';
import { NotaFiscalUpload } from '@/components/revisions/NotaFiscalUpload';
import { ValorRevisaoInput } from '@/components/revisions/ValorRevisaoInput';
import { CheckCircle2 } from 'lucide-react';

interface VeiculoRevisoesProps {
  veiculo: VeiculoComRevisoes;
  isUpdating: boolean;
  isMarking: boolean;
  onStatusChange: (revisaoId: string, status: ExecutionStatus) => Promise<void>;
  onPrevisaoChange: (revisaoId: string, date: string | null) => Promise<void>;
  onOficinaChange: (revisaoId: string, oficinaId: string | null) => Promise<void>;
  onOrdemServicoChange: (revisaoId: string, os: string | null) => Promise<void>;
  onValorChange: (revisaoId: string, valor: number | null) => Promise<void>;
  onNotaFiscalChange: (revisaoId: string, url: string | null) => Promise<void>;
  onMarcarRealizada: (revisaoId: string) => Promise<void>;
}

export function VeiculoRevisoes({
  veiculo,
  isUpdating,
  isMarking,
  onStatusChange,
  onPrevisaoChange,
  onOficinaChange,
  onOrdemServicoChange,
  onValorChange,
  onNotaFiscalChange,
  onMarcarRealizada,
}: VeiculoRevisoesProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revisões do Veículo</CardTitle>
        </CardHeader>
        <CardContent>
          {veiculo.revisoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma revisão cadastrada para este veículo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Revisão</TableHead>
                    <TableHead>Última Realizada</TableHead>
                    <TableHead>Faltam</TableHead>
                    <TableHead>Execução</TableHead>
                    <TableHead>Mecânicos</TableHead>
                    <TableHead>Prev. Entrega</TableHead>
                    <TableHead>Ordem de Serviço</TableHead>
                    <TableHead>Valor (R$)</TableHead>
                    <TableHead>Anexo NF</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...veiculo.revisoes]
                    .sort((a, b) => a.faltam - b.faltam)
                    .map((revisao) => (
                      <TableRow key={revisao.id}>
                        <TableCell className="font-medium">
                          {revisao.tipo_revisao?.nome || 'Revisão'}
                        </TableCell>
                        <TableCell>
                          {revisao.unidade === 'Km'
                            ? revisao.km_revisao
                              ? `${revisao.km_revisao.toLocaleString('pt-BR')} km`
                              : '-'
                            : revisao.hora_revisao
                              ? `${revisao.hora_revisao.toLocaleString('pt-BR')} h`
                              : '-'}
                          {revisao.data_revisao && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({format(new Date(revisao.data_revisao), 'dd/MM/yy')})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            'font-medium text-sm',
                            revisao.status === 'critical' && 'text-status-critical',
                            revisao.status === 'warning' && 'text-status-warning',
                            revisao.status === 'ok' && 'text-status-ok',
                          )}>
                            {revisao.faltam <= 0
                              ? 'Vencida'
                              : formatarKmOuHora(revisao.faltam, revisao.unidade)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusExecucaoSelect
                            value={revisao.status_execucao}
                            onChange={(s) => onStatusChange(revisao.id, s)}
                            isVencida={revisao.status === 'critical'}
                            disabled={isUpdating || isMarking}
                          />
                        </TableCell>
                        <TableCell>
                          <OficinaSelect
                            value={revisao.oficina_id}
                            onChange={(id) => onOficinaChange(revisao.id, id)}
                            disabled={isUpdating}
                            compact
                          />
                        </TableCell>
                        <TableCell>
                          <PrevisaoEntregaInput
                            value={revisao.previsao_entrega}
                            onChange={(d) => onPrevisaoChange(revisao.id, d)}
                            disabled={isUpdating}
                          />
                        </TableCell>
                        <TableCell>
                          <OrdemServicoInput
                            value={revisao.ordem_servico}
                            onChange={(os) => onOrdemServicoChange(revisao.id, os)}
                            disabled={isUpdating}
                            compact
                          />
                        </TableCell>
                        <TableCell>
                          <ValorRevisaoInput
                            value={revisao.valor}
                            onChange={(v) => onValorChange(revisao.id, v)}
                          />
                        </TableCell>
                        <TableCell>
                          <NotaFiscalUpload
                            revisaoId={revisao.id}
                            value={revisao.nota_fiscal_url}
                            onChange={(url) => onNotaFiscalChange(revisao.id, url)}
                            disabled={isUpdating}
                            compact
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={revisao.status === 'critical' ? 'default' : 'outline'}
                            onClick={() => onMarcarRealizada(revisao.id)}
                            disabled={isMarking}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Realizada
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-status-critical">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-status-critical">{veiculo.revisoesCriticas}</div>
            <p className="text-sm text-muted-foreground">Revisões vencidas</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-warning">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-status-warning">{veiculo.revisoesAtencao}</div>
            <p className="text-sm text-muted-foreground">Revisões com atenção</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-ok">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-status-ok">{veiculo.revisoesOk}</div>
            <p className="text-sm text-muted-foreground">Revisões em dia</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
