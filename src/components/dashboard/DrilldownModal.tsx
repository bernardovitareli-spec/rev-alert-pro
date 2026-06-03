import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink } from 'lucide-react';
import { RevisionDrilldownItem, PeriodType, ExecutionStatus } from '@/types/fleet';
import { formatarKmOuHora } from '@/lib/revisionCalculations';
import { StatusExecucaoSelect } from '@/components/revisions/StatusExecucaoSelect';
import { PrevisaoEntregaInput } from '@/components/revisions/PrevisaoEntregaInput';
import { OficinaSelect } from '@/components/revisions/OficinaSelect';
import { ValorRevisaoInput } from '@/components/revisions/ValorRevisaoInput';
import { useUpdateStatusExecucao, useMarcarRevisaoRealizada } from '@/hooks/useFleetData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: RevisionDrilldownItem[];
  periodType: PeriodType;
}

const periodTitles: Record<PeriodType, string> = {
  vencidas: 'Revisões Vencidas',
  hoje: 'Revisões para Hoje',
  amanha: 'Revisões para Amanhã',
  essaSemana: 'Revisões Esta Semana',
  proximaSemana: 'Revisões Próxima Semana',
  esseMes: 'Revisões Este Mês',
  emServico: 'Revisões Em Serviço',
};

export function DrilldownModal({ open, onOpenChange, items, periodType }: DrilldownModalProps) {
  const navigate = useNavigate();
  const updateStatusExecucao = useUpdateStatusExecucao();
  const marcarRevisao = useMarcarRevisaoRealizada();

  const handleViewVehicle = (veiculoId: string) => {
    onOpenChange(false);
    navigate(`/veiculos/${veiculoId}`);
  };

  const handleStatusChange = async (item: RevisionDrilldownItem, newStatus: ExecutionStatus) => {
    if (newStatus === 'realizada') {
      try {
        await marcarRevisao.mutateAsync({
          revisaoId: item.revisaoId,
          kmAtual: item.kmAtual,
          horaAtual: item.horaAtual,
        });
        toast.success('Revisão marcada como realizada!');
      } catch (_err) {
        toast.error('Erro ao marcar revisão');
      }
      return;
    }

    try {
      await updateStatusExecucao.mutateAsync({
        revisaoId: item.revisaoId,
        statusExecucao: newStatus,
      });
      toast.success('Status atualizado!');
    } catch (_err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handlePrevisaoChange = async (item: RevisionDrilldownItem, date: string | null) => {
    try {
      await updateStatusExecucao.mutateAsync({
        revisaoId: item.revisaoId,
        previsaoEntrega: date,
      });
      toast.success('Previsão de entrega atualizada!');
    } catch (_err) {
      toast.error('Erro ao atualizar previsão');
    }
  };

  const handleOficinaChange = async (item: RevisionDrilldownItem, oficinaId: string | null) => {
    try {
      await updateStatusExecucao.mutateAsync({
        revisaoId: item.revisaoId,
        oficinaId,
      });
      toast.success('Oficina atualizada!');
    } catch (_err) {
      toast.error('Erro ao atualizar oficina');
    }
  };

  const handleValorChange = async (item: RevisionDrilldownItem, valor: number | null) => {
    try {
      await updateStatusExecucao.mutateAsync({
        revisaoId: item.revisaoId,
        valor,
      });
      toast.success('Valor atualizado!');
    } catch (_err) {
      toast.error('Erro ao atualizar valor');
    }
  };

  const formatDiasRestantes = (dias: number | null) => {
    if (dias === null) return '-';
    if (dias < 0) return `${Math.abs(dias)} dias atrás`;
    if (dias === 0) return 'Hoje';
    if (dias === 1) return 'Amanhã';
    return `${dias} dias`;
  };

  const showOficina = items.some(item => item.statusExecucao === 'em_servico');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {periodTitles[periodType]}
            <Badge variant="secondary" className="ml-2">
              {items.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh]">
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Nenhuma revisão encontrada para este período.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Execução</TableHead>
                  {showOficina && <TableHead>Oficina</TableHead>}
                  <TableHead>Valor (R$)</TableHead>
                  <TableHead>Prev. Entrega</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.revisaoId}>
                    <TableCell>
                      <div className="font-medium">{item.veiculoPlaca}</div>
                      {item.veiculoTag && (
                        <div className="text-xs text-muted-foreground">{item.veiculoTag}</div>
                      )}
                      {item.empresaNome && (
                        <div className="text-xs text-muted-foreground">{item.empresaNome}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.tipoRevisaoNome}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatarKmOuHora(Math.abs(item.faltam), item.unidade)} {item.faltam <= 0 ? 'vencido' : 'restantes'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-sm',
                        item.diasEstimados !== null && item.diasEstimados <= 0 
                          ? 'text-destructive font-medium' 
                          : 'text-muted-foreground'
                      )}>
                        {formatDiasRestantes(item.diasEstimados)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusExecucaoSelect
                        value={item.statusExecucao}
                        onChange={(newStatus) => handleStatusChange(item, newStatus)}
                        isVencida={item.status === 'critical'}
                        disabled={updateStatusExecucao.isPending || marcarRevisao.isPending}
                      />
                    </TableCell>
                    {showOficina && (
                      <TableCell>
                        {item.statusExecucao === 'em_servico' ? (
                          <OficinaSelect
                            value={item.oficinaId || null}
                            onChange={(oficinaId) => handleOficinaChange(item, oficinaId)}
                            disabled={updateStatusExecucao.isPending}
                            compact
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <ValorRevisaoInput
                        value={item.valor || null}
                        onChange={(valor) => handleValorChange(item, valor)}
                      />
                    </TableCell>
                    <TableCell>
                      <PrevisaoEntregaInput
                        value={item.previsaoEntrega}
                        onChange={(date) => handlePrevisaoChange(item, date)}
                        disabled={updateStatusExecucao.isPending}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewVehicle(item.veiculoId)}
                        title="Ver detalhes do veículo"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
