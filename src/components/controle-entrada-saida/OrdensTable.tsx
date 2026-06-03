import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { OrdemServico, StatusOrdemServico, TipoRevisao } from '@/types/fleet';
import { AvariasDetailDialog } from './AvariasDetailDialog';
import { RegistrarSaidaDialog } from './RegistrarSaidaDialog';
import { EditOrdemDialog } from './EditOrdemDialog';
import { SUBCATEGORIAS, STATUS_CONFIG, formatDateSafe } from './constants';
import { useDeleteOrdemServico } from '@/hooks/useOrdensServico';

type OrdemRow = OrdemServico & { tipo_revisao?: TipoRevisao | null };

interface Props {
  ordens: OrdemRow[];
  isAdmin: boolean;
  onChanged: () => void;
}

export function OrdensTable({ ordens, isAdmin, onChanged }: Props) {
  const deleteOS = useDeleteOrdemServico();

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Subcategoria / Revisão</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Previsão Saída</TableHead>
              <TableHead>Avarias</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordens.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma ordem de serviço encontrada
                </TableCell>
              </TableRow>
            )}
            {ordens.map((o) => {
              const sc = STATUS_CONFIG[o.status as StatusOrdemServico] ?? STATUS_CONFIG.aberta;
              const Icon = sc.icon;

              return (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    {o.veiculo?.placa_serie}
                    {o.veiculo?.tag_obra && (
                      <span className="text-xs text-muted-foreground ml-1">({o.veiculo.tag_obra})</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.tipo_manutencao === 'corretiva' ? 'destructive' : 'secondary'}>
                      {o.tipo_manutencao === 'corretiva' ? 'Corretiva' : 'Preventiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.tipo_manutencao === 'corretiva'
                      ? SUBCATEGORIAS.find((s) => s.value === o.subcategoria_corretiva)?.label || '-'
                      : o.tipo_revisao?.nome || '-'}
                  </TableCell>
                  <TableCell className="text-sm">{formatDateSafe(o.data_entrada)}</TableCell>
                  <TableCell className="text-sm">{formatDateSafe(o.previsao_saida)}</TableCell>
                  <TableCell>
                    {o.tem_avarias ? (
                      <AvariasDetailDialog ordem={o} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Não</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sc.variant} className="gap-1">
                      <Icon className="h-3 w-3" /> {sc.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {o.status !== 'concluida' && (
                        <RegistrarSaidaDialog ordem={o} onSuccess={onChanged} />
                      )}
                      {o.status === 'concluida' && o.data_saida && (
                        <span className="text-xs text-muted-foreground">
                          Saiu em {formatDateSafe(o.data_saida)}
                        </span>
                      )}
                      {isAdmin && (
                        <>
                          <EditOrdemDialog ordem={o} onSuccess={onChanged} />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Ordem de Serviço</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta ordem de serviço do veículo <strong>{o.veiculo?.placa_serie}</strong>? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async () => {
                                    try {
                                      await deleteOS.mutateAsync(o.id);
                                      toast.success('Ordem excluída com sucesso!');
                                      onChanged();
                                    } catch (e) {
                                      const msg = e instanceof Error ? e.message : String(e);
                                      toast.error('Erro ao excluir: ' + msg);
                                    }
                                  }}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
