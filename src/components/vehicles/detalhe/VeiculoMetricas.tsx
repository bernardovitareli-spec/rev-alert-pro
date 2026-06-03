import { useState } from 'react';
import { VeiculoComRevisoes } from '@/types/fleet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Gauge, Clock, Calendar, Save, RotateCcw } from 'lucide-react';

interface VeiculoMetricasProps {
  veiculo: VeiculoComRevisoes;
  isUpdating: boolean;
  onUpdate: (updates: { km_atual: number; hora_atual: number }) => Promise<void>;
}

export function VeiculoMetricas({ veiculo, isUpdating, onUpdate }: VeiculoMetricasProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [kmEdit, setKmEdit] = useState<number | null>(null);
  const [horaEdit, setHoraEdit] = useState<number | null>(null);

  const startEdit = () => {
    setKmEdit(veiculo.km_atual);
    setHoraEdit(veiculo.hora_atual);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setKmEdit(null);
    setHoraEdit(null);
  };

  const saveEdit = async () => {
    if (kmEdit === null || horaEdit === null) return;
    try {
      await onUpdate({ km_atual: kmEdit, hora_atual: horaEdit });
      toast.success('Valores atualizados com sucesso!');
      setIsEditing(false);
    } catch {
      toast.error('Erro ao atualizar valores');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Métricas de Uso</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <p className="text-2xl font-semibold">{veiculo.km_atual.toLocaleString('pt-BR')}</p>
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
              <p className="text-2xl font-semibold">{veiculo.hora_atual.toLocaleString('pt-BR')}h</p>
            )}
          </div>

          {/* Última Atualização */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Última Atualização</span>
            </div>
            <p className="text-lg font-medium">
              {veiculo.ultima_atualizacao
                ? format(new Date(veiculo.ultima_atualizacao), 'dd/MM/yyyy', { locale: ptBR })
                : 'Nunca'}
            </p>
            {veiculo.retorno_patio && (
              <p className="text-xs text-muted-foreground">
                Retorno ao pátio:{' '}
                {format(new Date(veiculo.retorno_patio), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t">
          {isEditing ? (
            <>
              <Button onClick={saveEdit} disabled={isUpdating}>
                <Save className="h-4 w-4 mr-2" /> Salvar KM/Horímetro
              </Button>
              <Button variant="outline" onClick={cancelEdit}>Cancelar</Button>
            </>
          ) : (
            <Button variant="outline" onClick={startEdit}>
              <RotateCcw className="h-4 w-4 mr-2" /> Atualizar KM/Horímetro
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
