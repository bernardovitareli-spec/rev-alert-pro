import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useVeiculoDetalhe, useUpdateVeiculo, useMarcarRevisaoRealizada, useUpdateStatusExecucao, useEmpresas } from '@/hooks/useFleetData';
import { useContratos } from '@/hooks/useContratos';
import { formatarKmOuHora, getStatusLabel } from '@/lib/revisionCalculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StatusExecucaoSelect } from '@/components/revisions/StatusExecucaoSelect';
import { PrevisaoEntregaInput } from '@/components/revisions/PrevisaoEntregaInput';
import { OficinaSelect } from '@/components/revisions/OficinaSelect';
import { OrdemServicoInput } from '@/components/revisions/OrdemServicoInput';
import { NotaFiscalUpload } from '@/components/revisions/NotaFiscalUpload';
import { ValorRevisaoInput } from '@/components/revisions/ValorRevisaoInput';
import { DocumentoVeiculoUpload } from '@/components/vehicles/DocumentoVeiculoUpload';
import { ValidadeDocumentoInput } from '@/components/vehicles/ValidadeDocumentoInput';
import { ExecutionStatus, TipoDocumentoVeiculo } from '@/types/fleet';
import { 
  ArrowLeft, 
  Truck, 
  Building2, 
  Calendar, 
  Gauge, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Save,
  RotateCcw,
  FileText,
  Timer,
  FileCheck,
  Tag,
  FileSignature
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function VeiculoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: veiculo, isLoading, error } = useVeiculoDetalhe(id || '');
  const updateVeiculo = useUpdateVeiculo();
  const marcarRevisao = useMarcarRevisaoRealizada();
  const updateStatusExecucao = useUpdateStatusExecucao();
  const { data: empresas } = useEmpresas();

  // Contratos filtrados pela empresa do veículo
  const empresaIdParaContrato = veiculo?.empresa_id || undefined;
  const { data: contratosDisponiveis } = useContratos(empresaIdParaContrato);

  const [kmEdit, setKmEdit] = useState<number | null>(null);
  const [horaEdit, setHoraEdit] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [tagObraEdit, setTagObraEdit] = useState<string>('');
  const [isEditingTagObra, setIsEditingTagObra] = useState(false);

  const [contratoIdEdit, setContratoIdEdit] = useState<string>('');
  const [isEditingContrato, setIsEditingContrato] = useState(false);

  const [empresaIdEdit, setEmpresaIdEdit] = useState<string>('');
  const [isEditingEmpresa, setIsEditingEmpresa] = useState(false);

  const handleStartEdit = () => {
    if (veiculo) {
      setKmEdit(veiculo.km_atual);
      setHoraEdit(veiculo.hora_atual);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setKmEdit(null);
    setHoraEdit(null);
  };

  const handleSaveEdit = async () => {
    if (!veiculo || kmEdit === null || horaEdit === null) return;

    try {
      await updateVeiculo.mutateAsync({
        id: veiculo.id,
        km_atual: kmEdit,
        hora_atual: horaEdit,
      });
      toast.success('Valores atualizados com sucesso!');
      setIsEditing(false);
    } catch (_err) {
      toast.error('Erro ao atualizar valores');
    }
  };

  const handleStartEditTagObra = () => {
    if (veiculo) {
      setTagObraEdit(veiculo.tag_obra || '');
      setIsEditingTagObra(true);
    }
  };

  const handleCancelEditTagObra = () => {
    setIsEditingTagObra(false);
    setTagObraEdit('');
  };

  const handleSaveTagObra = async () => {
    if (!veiculo) return;

    try {
      await updateVeiculo.mutateAsync({
        id: veiculo.id,
        tag_obra: tagObraEdit.trim() || null,
      });
      toast.success('Tag da Obra atualizada com sucesso!');
      setIsEditingTagObra(false);
    } catch (_err) {
      toast.error('Erro ao atualizar Tag da Obra');
    }
  };

  const handleStartEditContrato = () => {
    if (veiculo) {
      setContratoIdEdit(veiculo.contrato_id || 'none');
      setIsEditingContrato(true);
    }
  };

  const handleCancelEditContrato = () => {
    setIsEditingContrato(false);
    setContratoIdEdit('');
  };

  const handleSaveContrato = async () => {
    if (!veiculo) return;

    try {
      await updateVeiculo.mutateAsync({
        id: veiculo.id,
        contrato_id: contratoIdEdit === 'none' ? null : (contratoIdEdit || null),
      });
      toast.success('Contrato atualizado com sucesso!');
      setIsEditingContrato(false);
    } catch (_err) {
      toast.error('Erro ao atualizar Contrato');
    }
  };

  const handleStartEditEmpresa = () => {
    if (veiculo) {
      setEmpresaIdEdit(veiculo.empresa_id || '');
      setIsEditingEmpresa(true);
    }
  };

  const handleCancelEditEmpresa = () => {
    setIsEditingEmpresa(false);
    setEmpresaIdEdit('');
  };

  const handleSaveEmpresa = async () => {
    if (!veiculo) return;

    try {
      await updateVeiculo.mutateAsync({
        id: veiculo.id,
        empresa_id: empresaIdEdit || null,
      });
      toast.success('Empresa atualizada com sucesso!');
      setIsEditingEmpresa(false);
    } catch (_err) {
      toast.error('Erro ao atualizar Empresa');
    }
  };

  const handleMarcarRevisao = async (revisaoId: string) => {
    if (!veiculo) return;

    try {
      await marcarRevisao.mutateAsync({
        revisaoId,
        kmAtual: veiculo.km_atual,
        horaAtual: veiculo.hora_atual,
      });
      toast.success('Revisão marcada como realizada!');
    } catch (_err) {
      toast.error('Erro ao marcar revisão');
    }
  };

  const handleStatusChange = async (revisaoId: string, newStatus: ExecutionStatus) => {
    if (!veiculo) return;

    // Se mudou para "realizada", usar o fluxo completo de marcar revisão
    if (newStatus === 'realizada') {
      await handleMarcarRevisao(revisaoId);
      return;
    }

    try {
      await updateStatusExecucao.mutateAsync({
        revisaoId,
        statusExecucao: newStatus,
      });
      toast.success('Status atualizado!');
    } catch (_err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handlePrevisaoChange = async (revisaoId: string, date: string | null) => {
    try {
      await updateStatusExecucao.mutateAsync({
        revisaoId,
        previsaoEntrega: date,
      });
      toast.success('Previsão de entrega atualizada!');
    } catch (_err) {
      toast.error('Erro ao atualizar previsão');
    }
  };

  const handleOficinaChange = async (revisaoId: string, oficinaId: string | null) => {
    try {
      await updateStatusExecucao.mutateAsync({
        revisaoId,
        oficinaId,
      });
      toast.success('Oficina atualizada!');
    } catch (_err) {
      toast.error('Erro ao atualizar oficina');
    }
  };

  const handleOrdemServicoChange = async (revisaoId: string, ordemServico: string | null) => {
    try {
      await updateStatusExecucao.mutateAsync({
        revisaoId,
        ordemServico,
      });
      toast.success('Ordem de serviço atualizada!');
    } catch (_err) {
      toast.error('Erro ao atualizar OS');
    }
  };

  const handleNotaFiscalChange = async (revisaoId: string, notaFiscalUrl: string | null) => {
    try {
      await updateStatusExecucao.mutateAsync({
        revisaoId,
        notaFiscalUrl,
      });
    } catch (_err) {
      toast.error('Erro ao atualizar anexo');
    }
  };

  const handleValorChange = async (revisaoId: string, valor: number | null) => {
    try {
      await updateStatusExecucao.mutateAsync({
        revisaoId,
        valor,
      });
      toast.success('Valor atualizado!');
    } catch (_err) {
      toast.error('Erro ao atualizar valor');
    }
  };

  const handleDocumentoChange = async (tipoDocumento: TipoDocumentoVeiculo, url: string | null) => {
    if (!veiculo) return;

    try {
      const updateData: Record<string, string | null> = {};
      if (tipoDocumento === 'crlv') updateData.crlv_url = url;
      if (tipoDocumento === 'tacografo') updateData.tacografo_url = url;
      if (tipoDocumento === 'documento') updateData.documento_url = url;
      if (tipoDocumento === 'art') updateData.art_url = url;

      await updateVeiculo.mutateAsync({
        id: veiculo.id,
        ...updateData,
      });
    } catch (_err) {
      toast.error('Erro ao atualizar documento');
    }
  };

  const handleValidadeChange = async (tipo: 'crlv' | 'tacografo' | 'art', validade: string | null) => {
    if (!veiculo) return;

    try {
      const updateData: Record<string, string | null> = {};
      if (tipo === 'crlv') updateData.crlv_validade = validade;
      if (tipo === 'tacografo') updateData.tacografo_validade = validade;
      if (tipo === 'art') updateData.art_validade = validade;

      await updateVeiculo.mutateAsync({
        id: veiculo.id,
        ...updateData,
      });
      toast.success('Validade atualizada!');
    } catch (_err) {
      toast.error('Erro ao atualizar validade');
    }
  };

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
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para lista
          </Button>
        </div>
      </AppLayout>
    );
  }

  const statusIcon = {
    critical: <AlertTriangle className="h-5 w-5" />,
    warning: <Clock className="h-5 w-5" />,
    ok: <CheckCircle2 className="h-5 w-5" />,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/veiculos')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg',
              veiculo.statusGeral === 'critical' && 'bg-status-critical/10 text-status-critical',
              veiculo.statusGeral === 'warning' && 'bg-status-warning/10 text-status-warning',
              veiculo.statusGeral === 'ok' && 'bg-status-ok/10 text-status-ok'
            )}>
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{veiculo.placa_serie}</h1>
              {veiculo.tag_obra && (
                <p className="text-muted-foreground">{veiculo.tag_obra}</p>
              )}
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              'flex items-center gap-1 text-sm px-3 py-1',
              veiculo.statusGeral === 'critical' && 'status-badge-critical',
              veiculo.statusGeral === 'warning' && 'status-badge-warning',
              veiculo.statusGeral === 'ok' && 'status-badge-ok'
            )}
          >
            {statusIcon[veiculo.statusGeral]}
            {getStatusLabel(veiculo.statusGeral)}
          </Badge>
        </div>

        {/* Vehicle Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações do Veículo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* KM */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  <span className="text-sm">KM Atual</span>
                </div>
                {isEditing ? (
                  <Input
                    type="number"
                    value={kmEdit ?? ''}
                    onChange={(e) => setKmEdit(Number(e.target.value))}
                    className="font-semibold"
                  />
                ) : (
                  <p className="text-2xl font-semibold">
                    {veiculo.km_atual.toLocaleString('pt-BR')}
                  </p>
                )}
              </div>

              {/* Horímetro */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Horímetro</span>
                </div>
                {isEditing ? (
                  <Input
                    type="number"
                    value={horaEdit ?? ''}
                    onChange={(e) => setHoraEdit(Number(e.target.value))}
                    className="font-semibold"
                  />
                ) : (
                  <p className="text-2xl font-semibold">
                    {veiculo.hora_atual.toLocaleString('pt-BR')}h
                  </p>
                )}
              </div>

              {/* Tag da Obra */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span className="text-sm">Tag da Obra</span>
                </div>
                {isEditingTagObra ? (
                  <Input
                    type="text"
                    value={tagObraEdit}
                    onChange={(e) => setTagObraEdit(e.target.value)}
                    className="font-semibold"
                    placeholder="Ex: Obra Centro"
                    autoFocus
                  />
                ) : (
                  <p className="text-lg font-medium">
                    {veiculo.tag_obra || 'Não definida'}
                  </p>
                )}
              </div>

              {/* Contrato */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileSignature className="h-4 w-4" />
                  <span className="text-sm">Contrato</span>
                </div>
                {isEditingContrato ? (
                  <Select value={contratoIdEdit} onValueChange={setContratoIdEdit}>
                    <SelectTrigger className="font-semibold bg-background">
                      <SelectValue placeholder="Selecione o contrato..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md z-50">
                      <SelectItem value="none">Nenhum</SelectItem>
                      {contratosDisponiveis?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg font-medium">
                    {(() => {
                      const contratoId = veiculo.contrato_id;
                      const contratoNome = contratosDisponiveis?.find(c => c.id === contratoId)?.nome;
                      return contratoNome || veiculo.contrato || 'Não definido';
                    })()}
                  </p>
                )}
              </div>

              {/* Empresa */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">Empresa</span>
                </div>
                {isEditingEmpresa ? (
                  <Select value={empresaIdEdit} onValueChange={setEmpresaIdEdit}>
                    <SelectTrigger className="font-semibold bg-background">
                      <SelectValue placeholder="Selecione a empresa..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md z-50">
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {empresas?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg font-medium">
                    {veiculo.empresa?.nome || 'Não definida'}
                  </p>
                )}
              </div>

              {/* Última Atualização */}
              <div className="space-y-2 md:col-span-2 lg:col-span-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Última Atualização</span>
                </div>
                <p className="text-lg font-medium">
                  {veiculo.ultima_atualizacao
                    ? format(new Date(veiculo.ultima_atualizacao), "dd/MM/yyyy", { locale: ptBR })
                    : 'Nunca'}
                </p>
              </div>
            </div>

            {/* Edit Buttons */}
            <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
              {/* KM/Horímetro edit flow */}
              {isEditing ? (
                <>
                  <Button onClick={handleSaveEdit} disabled={updateVeiculo.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar KM/Horímetro
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleStartEdit}
                  disabled={isEditingTagObra || isEditingEmpresa || isEditingContrato}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Atualizar KM/Horímetro
                </Button>
              )}

              {/* Tag da Obra edit flow */}
              {isEditingTagObra ? (
                <>
                  <Button onClick={handleSaveTagObra} disabled={updateVeiculo.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Tag da Obra
                  </Button>
                  <Button variant="outline" onClick={handleCancelEditTagObra}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleStartEditTagObra}
                  disabled={isEditing || isEditingEmpresa || isEditingContrato}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Atualizar Tag da Obra
                </Button>
              )}

              {/* Contrato edit flow */}
              {isEditingContrato ? (
                <>
                  <Button onClick={handleSaveContrato} disabled={updateVeiculo.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Contrato
                  </Button>
                  <Button variant="outline" onClick={handleCancelEditContrato}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleStartEditContrato}
                  disabled={isEditing || isEditingTagObra || isEditingEmpresa}
                >
                  <FileSignature className="h-4 w-4 mr-2" />
                  Atualizar Contrato
                </Button>
              )}

              {/* Empresa edit flow */}
              {isEditingEmpresa ? (
                <>
                  <Button onClick={handleSaveEmpresa} disabled={updateVeiculo.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Empresa
                  </Button>
                  <Button variant="outline" onClick={handleCancelEditEmpresa}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleStartEditEmpresa}
                  disabled={isEditing || isEditingTagObra || isEditingContrato}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Atualizar Empresa
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos do Veículo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CRLV */}
              <Card className="border-2">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileCheck className="h-5 w-5 text-primary" />
                    <span className="font-medium">CRLV</span>
                  </div>
                  <DocumentoVeiculoUpload
                    veiculoId={veiculo.id}
                    tipoDocumento="crlv"
                    label="CRLV"
                    value={veiculo.crlv_url || null}
                    onChange={(url) => handleDocumentoChange('crlv', url)}
                    disabled={updateVeiculo.isPending}
                  />
                  <div className="mt-3">
                    <label className="text-xs text-muted-foreground mb-1 block">Validade</label>
                    <ValidadeDocumentoInput
                      value={veiculo.crlv_validade || null}
                      onChange={(v) => handleValidadeChange('crlv', v)}
                      disabled={updateVeiculo.isPending}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Tacógrafo */}
              <Card className="border-2">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Timer className="h-5 w-5 text-primary" />
                    <span className="font-medium">Tacógrafo</span>
                  </div>
                  <DocumentoVeiculoUpload
                    veiculoId={veiculo.id}
                    tipoDocumento="tacografo"
                    label="Tacógrafo"
                    value={veiculo.tacografo_url || null}
                    onChange={(url) => handleDocumentoChange('tacografo', url)}
                    disabled={updateVeiculo.isPending}
                  />
                  <div className="mt-3">
                    <label className="text-xs text-muted-foreground mb-1 block">Validade</label>
                    <ValidadeDocumentoInput
                      value={veiculo.tacografo_validade || null}
                      onChange={(v) => handleValidadeChange('tacografo', v)}
                      disabled={updateVeiculo.isPending}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Documento do Veículo */}
              <Card className="border-2">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">Nota Fiscal</span>
                  </div>
                  <DocumentoVeiculoUpload
                    veiculoId={veiculo.id}
                    tipoDocumento="documento"
                    label="Documento"
                    value={veiculo.documento_url || null}
                    onChange={(url) => handleDocumentoChange('documento', url)}
                    disabled={updateVeiculo.isPending}
                  />
                </CardContent>
              </Card>

              {/* ART */}
              <Card className="border-2">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileSignature className="h-5 w-5 text-primary" />
                    <span className="font-medium">ART</span>
                  </div>
                  <DocumentoVeiculoUpload
                    veiculoId={veiculo.id}
                    tipoDocumento="art"
                    label="ART"
                    value={veiculo.art_url || null}
                    onChange={(url) => handleDocumentoChange('art', url)}
                    disabled={updateVeiculo.isPending}
                  />
                  <div className="mt-3">
                    <label className="text-xs text-muted-foreground mb-1 block">Validade</label>
                    <ValidadeDocumentoInput
                      value={veiculo.art_validade || null}
                      onChange={(v) => handleValidadeChange('art', v)}
                      disabled={updateVeiculo.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Revisions Table */}
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
                    {veiculo.revisoes
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
                              : '-'
                          }
                          {revisao.data_revisao && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({format(new Date(revisao.data_revisao), "dd/MM/yy")})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            'font-medium text-sm',
                            revisao.status === 'critical' && 'text-status-critical',
                            revisao.status === 'warning' && 'text-status-warning',
                            revisao.status === 'ok' && 'text-status-ok'
                          )}>
                            {revisao.faltam <= 0 
                              ? `Vencida`
                              : formatarKmOuHora(revisao.faltam, revisao.unidade)
                            }
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusExecucaoSelect
                            value={revisao.status_execucao}
                            onChange={(newStatus) => handleStatusChange(revisao.id, newStatus)}
                            isVencida={revisao.status === 'critical'}
                            disabled={updateStatusExecucao.isPending || marcarRevisao.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          <OficinaSelect
                            value={revisao.oficina_id}
                            onChange={(oficinaId) => handleOficinaChange(revisao.id, oficinaId)}
                            disabled={updateStatusExecucao.isPending}
                            compact
                          />
                        </TableCell>
                        <TableCell>
                          <PrevisaoEntregaInput
                            value={revisao.previsao_entrega}
                            onChange={(date) => handlePrevisaoChange(revisao.id, date)}
                            disabled={updateStatusExecucao.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          <OrdemServicoInput
                            value={revisao.ordem_servico}
                            onChange={(os) => handleOrdemServicoChange(revisao.id, os)}
                            disabled={updateStatusExecucao.isPending}
                            compact
                          />
                        </TableCell>
                        <TableCell>
                          <ValorRevisaoInput
                            value={revisao.valor}
                            onChange={(valor) => handleValorChange(revisao.id, valor)}
                          />
                        </TableCell>
                        <TableCell>
                          <NotaFiscalUpload
                            revisaoId={revisao.id}
                            value={revisao.nota_fiscal_url}
                            onChange={(url) => handleNotaFiscalChange(revisao.id, url)}
                            disabled={updateStatusExecucao.isPending}
                            compact
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={revisao.status === 'critical' ? 'default' : 'outline'}
                            onClick={() => handleMarcarRevisao(revisao.id)}
                            disabled={marcarRevisao.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Realizada
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
      </div>
    </AppLayout>
  );
}
