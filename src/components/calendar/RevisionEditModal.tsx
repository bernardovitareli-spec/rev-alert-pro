import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink, AlertCircle, AlertTriangle, CheckCircle, Car, Wrench } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusExecucaoSelect } from '@/components/revisions/StatusExecucaoSelect';
import { OficinaSelect } from '@/components/revisions/OficinaSelect';
import { PrevisaoEntregaInput } from '@/components/revisions/PrevisaoEntregaInput';
import { OrdemServicoInput } from '@/components/revisions/OrdemServicoInput';
import { NotaFiscalUpload } from '@/components/revisions/NotaFiscalUpload';
import { ValorRevisaoInput } from '@/components/revisions/ValorRevisaoInput';
import { ObservacoesInput } from '@/components/revisions/ObservacoesInput';
import { useMarcarRevisaoRealizada, useUpdateStatusExecucao } from '@/hooks/useFleetData';
import { RevisaoComStatus, RevisionStatus, ExecutionStatus } from '@/types/fleet';
import { getStatusLabel, formatarKmOuHora } from '@/lib/revisionCalculations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface RevisionWithDetails extends RevisaoComStatus {
  veiculoPlaca: string;
  veiculoTag: string | null;
  veiculoId: string;
  empresaNome: string | null;
}

interface RevisionEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revision: RevisionWithDetails | null;
}

export function RevisionEditModal({ open, onOpenChange, revision }: RevisionEditModalProps) {
  const navigate = useNavigate();
  const marcarRevisao = useMarcarRevisaoRealizada();
  const updateStatus = useUpdateStatusExecucao();

  if (!revision) return null;

  const getStatusIcon = (status: RevisionStatus) => {
    switch (status) {
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'ok': return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadgeClass = (status: RevisionStatus) => {
    switch (status) {
      case 'critical': return 'bg-status-critical text-white';
      case 'warning': return 'bg-status-warning text-black';
      case 'ok': return 'bg-status-ok text-white';
    }
  };

  const handleViewVehicle = () => {
    onOpenChange(false);
    navigate(`/veiculos/${revision.veiculoId}`);
  };

  const handleStatusChange = async (newStatus: ExecutionStatus) => {
    try {
      if (newStatus === 'realizada') {
        await marcarRevisao.mutateAsync({ 
          revisaoId: revision.id,
          kmAtual: revision.kmOuHoraAtual,
          horaAtual: revision.kmOuHoraAtual,
        });
        toast.success('Revisão marcada como realizada!');
        onOpenChange(false);
      } else {
        await updateStatus.mutateAsync({
          revisaoId: revision.id,
          statusExecucao: newStatus,
          previsaoEntrega: revision.previsao_entrega,
          oficinaId: revision.oficina_id,
        });
        toast.success('Status atualizado!');
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handlePrevisaoChange = async (date: string | null) => {
    try {
      await updateStatus.mutateAsync({
        revisaoId: revision.id,
        previsaoEntrega: date,
      });
      toast.success('Previsão de entrega atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar previsão');
    }
  };

  const handleOficinaChange = async (oficinaId: string | null) => {
    try {
      await updateStatus.mutateAsync({
        revisaoId: revision.id,
        oficinaId,
      });
      toast.success('Oficina atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar oficina');
    }
  };

  const handleOrdemServicoChange = async (ordemServico: string | null) => {
    try {
      await updateStatus.mutateAsync({
        revisaoId: revision.id,
        ordemServico,
      });
      toast.success('Ordem de serviço atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar OS');
    }
  };

  const handleNotaFiscalChange = async (notaFiscalUrl: string | null) => {
    try {
      await updateStatus.mutateAsync({
        revisaoId: revision.id,
        notaFiscalUrl,
      });
    } catch (error) {
      toast.error('Erro ao atualizar anexo');
    }
  };

  const handleValorChange = async (valor: number | null) => {
    try {
      await updateStatus.mutateAsync({
        revisaoId: revision.id,
        valor,
      });
      toast.success('Valor atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar valor');
    }
  };

  const handleObservacoesChange = async (observacoes: string | null) => {
    try {
      await updateStatus.mutateAsync({
        revisaoId: revision.id,
        observacoes,
      });
      // Toast is handled inside the ObservacoesInput component
    } catch (error) {
      toast.error('Erro ao atualizar observações');
    }
  };

  const handleMarcarRealizada = async () => {
    try {
      await marcarRevisao.mutateAsync({ 
        revisaoId: revision.id,
        kmAtual: revision.kmOuHoraAtual,
        horaAtual: revision.kmOuHoraAtual,
      });
      toast.success('Revisão marcada como realizada!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao marcar revisão');
    }
  };

  const isVencida = revision.status === 'critical';
  const showOficina = revision.status_execucao === 'em_servico';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Editar Revisão
          </DialogTitle>
        </DialogHeader>

        {/* Vehicle Info */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-lg">{revision.veiculoPlaca}</p>
                {revision.veiculoTag && (
                  <p className="text-sm text-muted-foreground">{revision.veiculoTag}</p>
                )}
                {revision.empresaNome && (
                  <p className="text-xs text-muted-foreground">{revision.empresaNome}</p>
                )}
              </div>
            </div>
            <Badge className={cn("gap-1", getStatusBadgeClass(revision.status))}>
              {getStatusIcon(revision.status)}
              {getStatusLabel(revision.status)}
            </Badge>
          </div>

          <Separator />

          {/* Revision Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tipo de Revisão</p>
              <p className="font-medium">{revision.tipo_revisao?.nome || 'Revisão'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Faltam</p>
              <p className={cn(
                "font-medium",
                revision.faltam < 0 && "text-destructive"
              )}>
                {formatarKmOuHora(revision.faltam, revision.unidade)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Próxima Revisão</p>
              <p className="font-medium">{formatarKmOuHora(revision.proximaRevisao, revision.unidade)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Atual</p>
              <p className="font-medium">{formatarKmOuHora(revision.kmOuHoraAtual, revision.unidade)}</p>
            </div>
            {revision.diasEstimados !== null && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Estimativa</p>
                <p className={cn(
                  "font-medium",
                  revision.diasEstimados < 0 && "text-destructive"
                )}>
                  {revision.diasEstimados < 0 
                    ? `${Math.abs(revision.diasEstimados)} dias atrasado`
                    : revision.diasEstimados === 0 
                      ? 'Hoje'
                      : `Em ${revision.diasEstimados} dias`
                  }
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Editable Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status de Execução</label>
              <StatusExecucaoSelect
                value={revision.status_execucao}
                onChange={handleStatusChange}
                isVencida={isVencida}
              />
            </div>

            {showOficina && (
              <div>
                <label className="text-sm font-medium mb-2 block">Oficina</label>
                <OficinaSelect
                  value={revision.oficina_id}
                  onChange={handleOficinaChange}
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Previsão de Entrega</label>
              <PrevisaoEntregaInput
                value={revision.previsao_entrega}
                onChange={handlePrevisaoChange}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Ordem de Serviço</label>
              <OrdemServicoInput
                value={revision.ordem_servico}
                onChange={handleOrdemServicoChange}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Anexo Nota Fiscal</label>
              <NotaFiscalUpload
                revisaoId={revision.id}
                value={revision.nota_fiscal_url}
                onChange={handleNotaFiscalChange}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Valor (R$)</label>
              <ValorRevisaoInput
                value={revision.valor || null}
                onChange={handleValorChange}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Observações</label>
              <ObservacoesInput
                value={revision.observacoes || null}
                onChange={handleObservacoesChange}
              />
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleViewVehicle}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Veículo
            </Button>
            {revision.status_execucao !== 'realizada' && !isVencida && (
              <Button
                className="flex-1"
                onClick={handleMarcarRealizada}
                disabled={marcarRevisao.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar Realizada
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
