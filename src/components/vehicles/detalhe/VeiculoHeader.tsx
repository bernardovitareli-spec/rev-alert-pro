import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VeiculoComRevisoes, Empresa } from '@/types/fleet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getStatusLabel } from '@/lib/revisionCalculations';
import {
  ArrowLeft, Truck, Building2, AlertTriangle, Clock, CheckCircle2,
  Tag, FileSignature, Save,
} from 'lucide-react';

type FieldEditing = 'none' | 'tag' | 'contrato' | 'empresa';

interface VeiculoHeaderProps {
  veiculo: VeiculoComRevisoes;
  empresas: Empresa[] | undefined;
  contratos: Array<{ id: string; nome: string }> | undefined;
  isUpdating: boolean;
  onUpdate: (updates: {
    tag_obra?: string | null;
    contrato_id?: string | null;
    empresa_id?: string | null;
  }) => Promise<void>;
}

export function VeiculoHeader({
  veiculo,
  empresas,
  contratos,
  isUpdating,
  onUpdate,
}: VeiculoHeaderProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<FieldEditing>('none');
  const [tagEdit, setTagEdit] = useState('');
  const [contratoEdit, setContratoEdit] = useState('');
  const [empresaEdit, setEmpresaEdit] = useState('');

  const statusIcon = {
    critical: <AlertTriangle className="h-5 w-5" />,
    warning: <Clock className="h-5 w-5" />,
    ok: <CheckCircle2 className="h-5 w-5" />,
  };

  const startTag = () => { setTagEdit(veiculo.tag_obra || ''); setEditing('tag'); };
  const startContrato = () => { setContratoEdit(veiculo.contrato_id || 'none'); setEditing('contrato'); };
  const startEmpresa = () => { setEmpresaEdit(veiculo.empresa_id || ''); setEditing('empresa'); };
  const cancel = () => setEditing('none');

  const saveTag = async () => {
    try {
      await onUpdate({ tag_obra: tagEdit.trim() || null });
      toast.success('Tag da Obra atualizada com sucesso!');
      setEditing('none');
    } catch { toast.error('Erro ao atualizar Tag da Obra'); }
  };

  const saveContrato = async () => {
    try {
      await onUpdate({ contrato_id: contratoEdit === 'none' ? null : (contratoEdit || null) });
      toast.success('Contrato atualizado com sucesso!');
      setEditing('none');
    } catch { toast.error('Erro ao atualizar Contrato'); }
  };

  const saveEmpresa = async () => {
    try {
      await onUpdate({ empresa_id: empresaEdit || null });
      toast.success('Empresa atualizada com sucesso!');
      setEditing('none');
    } catch { toast.error('Erro ao atualizar Empresa'); }
  };

  const contratoNome = (() => {
    const c = contratos?.find((c) => c.id === veiculo.contrato_id);
    return c?.nome || veiculo.contrato || 'Não definido';
  })();

  return (
    <>
      {/* Top bar */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/veiculos')} aria-label="Voltar para a lista de veículos">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg',
            veiculo.statusGeral === 'critical' && 'bg-status-critical/10 text-status-critical',
            veiculo.statusGeral === 'warning' && 'bg-status-warning/10 text-status-warning',
            veiculo.statusGeral === 'ok' && 'bg-status-ok/10 text-status-ok',
          )}>
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{veiculo.placa_serie}</h1>
            {veiculo.tag_obra && <p className="text-muted-foreground">{veiculo.tag_obra}</p>}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'flex items-center gap-1 text-sm px-3 py-1',
            veiculo.statusGeral === 'critical' && 'status-badge-critical',
            veiculo.statusGeral === 'warning' && 'status-badge-warning',
            veiculo.statusGeral === 'ok' && 'status-badge-ok',
          )}
        >
          {statusIcon[veiculo.statusGeral]}
          {getStatusLabel(veiculo.statusGeral)}
        </Badge>
      </div>

      {/* Identification Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identificação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tag da Obra */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span className="text-sm">Tag da Obra</span>
              </div>
              {editing === 'tag' ? (
                <Input
                  type="text"
                  value={tagEdit}
                  onChange={(e) => setTagEdit(e.target.value)}
                  className="font-semibold"
                  placeholder="Ex: Obra Centro"
                  autoFocus
                />
              ) : (
                <p className="text-lg font-medium">{veiculo.tag_obra || 'Não definida'}</p>
              )}
            </div>

            {/* Contrato */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileSignature className="h-4 w-4" />
                <span className="text-sm">Contrato</span>
              </div>
              {editing === 'contrato' ? (
                <Select value={contratoEdit} onValueChange={setContratoEdit}>
                  <SelectTrigger className="font-semibold bg-background">
                    <SelectValue placeholder="Selecione o contrato..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-md z-50">
                    <SelectItem value="none">Nenhum</SelectItem>
                    {contratos?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-lg font-medium">{contratoNome}</p>
              )}
            </div>

            {/* Empresa */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">Empresa</span>
              </div>
              {editing === 'empresa' ? (
                <Select value={empresaEdit} onValueChange={setEmpresaEdit}>
                  <SelectTrigger className="font-semibold bg-background">
                    <SelectValue placeholder="Selecione a empresa..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-md z-50">
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {empresas?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-lg font-medium">{veiculo.empresa?.nome || 'Não definida'}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
            {editing === 'tag' ? (
              <>
                <Button onClick={saveTag} disabled={isUpdating}>
                  <Save className="h-4 w-4 mr-2" /> Salvar Tag da Obra
                </Button>
                <Button variant="outline" onClick={cancel}>Cancelar</Button>
              </>
            ) : (
              <Button variant="outline" onClick={startTag} disabled={editing !== 'none'}>
                <Tag className="h-4 w-4 mr-2" /> Atualizar Tag da Obra
              </Button>
            )}

            {editing === 'contrato' ? (
              <>
                <Button onClick={saveContrato} disabled={isUpdating}>
                  <Save className="h-4 w-4 mr-2" /> Salvar Contrato
                </Button>
                <Button variant="outline" onClick={cancel}>Cancelar</Button>
              </>
            ) : (
              <Button variant="outline" onClick={startContrato} disabled={editing !== 'none'}>
                <FileSignature className="h-4 w-4 mr-2" /> Atualizar Contrato
              </Button>
            )}

            {editing === 'empresa' ? (
              <>
                <Button onClick={saveEmpresa} disabled={isUpdating}>
                  <Save className="h-4 w-4 mr-2" /> Salvar Empresa
                </Button>
                <Button variant="outline" onClick={cancel}>Cancelar</Button>
              </>
            ) : (
              <Button variant="outline" onClick={startEmpresa} disabled={editing !== 'none'}>
                <Building2 className="h-4 w-4 mr-2" /> Atualizar Empresa
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
