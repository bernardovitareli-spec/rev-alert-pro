import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  useVeiculoDetalhe,
  useUpdateVeiculo,
  useMarcarRevisaoRealizada,
  useUpdateStatusExecucao,
  useEmpresas,
} from '@/hooks/useFleetData';
import { useContratos } from '@/hooks/useContratos';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { ExecutionStatus, TipoDocumentoVeiculo } from '@/types/fleet';
import { VeiculoHeader } from '@/components/vehicles/detalhe/VeiculoHeader';
import { VeiculoMetricas } from '@/components/vehicles/detalhe/VeiculoMetricas';
import { VeiculoDocumentos } from '@/components/vehicles/detalhe/VeiculoDocumentos';
import { VeiculoRevisoes } from '@/components/vehicles/detalhe/VeiculoRevisoes';
import { VeiculoHistorico } from '@/components/vehicles/detalhe/VeiculoHistorico';

export default function VeiculoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isApontador } = useUserRole();
  const { data: veiculo, isLoading, error } = useVeiculoDetalhe(id || '');
  const updateVeiculo = useUpdateVeiculo();
  const marcarRevisao = useMarcarRevisaoRealizada();
  const updateStatusExecucao = useUpdateStatusExecucao();
  const { data: empresas } = useEmpresas();
  const { data: contratos } = useContratos(veiculo?.empresa_id || undefined);

  if (isApontador) {
    return <Navigate to="/veiculos" replace />;
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (error || !veiculo) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Veículo não encontrado</h2>
          <p className="text-muted-foreground mb-4">O veículo solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate('/veiculos')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para lista
          </Button>
        </div>
      </AppLayout>
    );
  }

  const handleUpdateVeiculo = async (updates: Record<string, unknown>) => {
    await updateVeiculo.mutateAsync({ id: veiculo.id, ...updates });
  };

  const handleMarcarRealizada = async (revisaoId: string) => {
    try {
      await marcarRevisao.mutateAsync({
        revisaoId,
        kmAtual: veiculo.km_atual,
        horaAtual: veiculo.hora_atual,
      });
      toast.success('Revisão marcada como realizada!');
    } catch {
      toast.error('Erro ao marcar revisão');
    }
  };

  const updateRevisao = async (
    revisaoId: string,
    partial: Parameters<typeof updateStatusExecucao.mutateAsync>[0] extends infer T
      ? T extends { revisaoId: string }
        ? Omit<T, 'revisaoId'>
        : never
      : never,
    successMessage?: string,
    errorMessage?: string,
  ) => {
    try {
      await updateStatusExecucao.mutateAsync({ revisaoId, ...partial } as any);
      if (successMessage) toast.success(successMessage);
    } catch {
      toast.error(errorMessage || 'Erro ao atualizar');
    }
  };

  const handleStatusChange = async (revisaoId: string, newStatus: ExecutionStatus) => {
    if (newStatus === 'realizada') return handleMarcarRealizada(revisaoId);
    await updateRevisao(revisaoId, { statusExecucao: newStatus } as any, 'Status atualizado!', 'Erro ao atualizar status');
  };

  const handleDocumentoChange = async (tipo: TipoDocumentoVeiculo, url: string | null) => {
    const map: Record<TipoDocumentoVeiculo, string> = {
      crlv: 'crlv_url', tacografo: 'tacografo_url', documento: 'documento_url', art: 'art_url',
    };
    try {
      await handleUpdateVeiculo({ [map[tipo]]: url });
    } catch {
      toast.error('Erro ao atualizar documento');
    }
  };

  const handleValidadeChange = async (tipo: 'crlv' | 'tacografo' | 'art', validade: string | null) => {
    const map = { crlv: 'crlv_validade', tacografo: 'tacografo_validade', art: 'art_validade' } as const;
    try {
      await handleUpdateVeiculo({ [map[tipo]]: validade });
      toast.success('Validade atualizada!');
    } catch {
      toast.error('Erro ao atualizar validade');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <VeiculoHeader
          veiculo={veiculo}
          empresas={empresas}
          contratos={contratos}
          isUpdating={updateVeiculo.isPending}
          onUpdate={handleUpdateVeiculo}
        />
        <VeiculoMetricas
          veiculo={veiculo}
          isUpdating={updateVeiculo.isPending}
          onUpdate={handleUpdateVeiculo}
        />
        <VeiculoDocumentos
          veiculo={veiculo}
          isUpdating={updateVeiculo.isPending}
          onDocumentoChange={handleDocumentoChange}
          onValidadeChange={handleValidadeChange}
        />
        <VeiculoRevisoes
          veiculo={veiculo}
          isUpdating={updateStatusExecucao.isPending}
          isMarking={marcarRevisao.isPending}
          onStatusChange={handleStatusChange}
          onPrevisaoChange={(id, d) => updateRevisao(id, { previsaoEntrega: d } as any, 'Previsão de entrega atualizada!', 'Erro ao atualizar previsão')}
          onOficinaChange={(id, oid) => updateRevisao(id, { oficinaId: oid } as any, 'Oficina atualizada!', 'Erro ao atualizar oficina')}
          onOrdemServicoChange={(id, os) => updateRevisao(id, { ordemServico: os } as any, 'Ordem de serviço atualizada!', 'Erro ao atualizar OS')}
          onValorChange={(id, v) => updateRevisao(id, { valor: v } as any, 'Valor atualizado!', 'Erro ao atualizar valor')}
          onNotaFiscalChange={(id, url) => updateRevisao(id, { notaFiscalUrl: url } as any, undefined, 'Erro ao atualizar anexo')}
          onMarcarRealizada={handleMarcarRealizada}
        />
        <VeiculoHistorico veiculoId={veiculo.id} />
      </div>
    </AppLayout>
  );
}
