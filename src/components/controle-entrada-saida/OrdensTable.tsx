import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Trash2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { OrdemServico, StatusOrdemServico, TipoRevisao } from '@/types/fleet';
import { AvariasDetailDialog } from './AvariasDetailDialog';
import { RegistrarSaidaDialog } from './RegistrarSaidaDialog';
import { EditOrdemDialog } from './EditOrdemDialog';
import { InformeDialog } from './InformeDialog';
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

  const renderDeleteDialog = (o: OrdemRow) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive" aria-label="Excluir ordem">
          <Trash2 className="h-3 w-3" aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Ordem de Serviço</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir esta ordem de serviço do veículo{' '}
            <strong>{o.veiculo?.placa_serie}</strong>? Esta ação não pode ser desfeita.
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
  );

  return (
    <Card>
      <CardContent className="p-0">
        {/* Desktop: Table */}
        <div className="hidden md:block">
          <Table>
            <caption className="sr-only">Lista de ordens de serviço com veículo, status, datas de entrada e saída e ações disponíveis.</caption>
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
                        <InformeDialog ordem={o} iconOnly />
                        {isAdmin && (
                          <>
                            <EditOrdemDialog ordem={o} onSuccess={onChanged} />
                            {renderDeleteDialog(o)}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden grid gap-3 p-3">
          {ordens.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma ordem de serviço encontrada
            </div>
          )}
          {ordens.map((o) => {
            const sc = STATUS_CONFIG[o.status as StatusOrdemServico] ?? STATUS_CONFIG.aberta;
            const Icon = sc.icon;
            const subcategoriaLabel =
              o.tipo_manutencao === 'corretiva'
                ? SUBCATEGORIAS.find((s) => s.value === o.subcategoria_corretiva)?.label
                : o.tipo_revisao?.nome;

            return (
              <Card key={o.id} className="border border-border/60">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{o.veiculo?.placa_serie}</p>
                      {o.veiculo?.tag_obra && (
                        <p className="text-xs text-muted-foreground truncate">{o.veiculo.tag_obra}</p>
                      )}
                    </div>
                    <Badge variant={sc.variant} className="gap-1 shrink-0">
                      <Icon className="h-3 w-3" /> {sc.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={o.tipo_manutencao === 'corretiva' ? 'destructive' : 'secondary'}>
                      {o.tipo_manutencao === 'corretiva' ? 'Corretiva' : 'Preventiva'}
                    </Badge>
                    {subcategoriaLabel && (
                      <span className="text-xs text-muted-foreground truncate">{subcategoriaLabel}</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {o.status !== 'concluida' && (
                      <div className="flex-1">
                        <RegistrarSaidaDialog ordem={o} onSuccess={onChanged} />
                      </div>
                    )}
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button size="sm" variant="ghost" className="flex-1">
                          Ver detalhes <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle>Ordem — {o.veiculo?.placa_serie}</SheetTitle>
                        </SheetHeader>
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <dt className="text-xs text-muted-foreground">Tipo</dt>
                            <dd className="font-medium">
                              {o.tipo_manutencao === 'corretiva' ? 'Corretiva' : 'Preventiva'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Status</dt>
                            <dd className="font-medium">{sc.label}</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-xs text-muted-foreground">
                              {o.tipo_manutencao === 'corretiva' ? 'Subcategoria' : 'Tipo de revisão'}
                            </dt>
                            <dd className="font-medium">{subcategoriaLabel || '-'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Entrada</dt>
                            <dd>{formatDateSafe(o.data_entrada)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Previsão saída</dt>
                            <dd>{formatDateSafe(o.previsao_saida)}</dd>
                          </div>
                          {o.status === 'concluida' && o.data_saida && (
                            <div className="col-span-2">
                              <dt className="text-xs text-muted-foreground">Saída</dt>
                              <dd>{formatDateSafe(o.data_saida)}</dd>
                            </div>
                          )}
                          <div className="col-span-2">
                            <dt className="text-xs text-muted-foreground">Avarias</dt>
                            <dd>
                              {o.tem_avarias ? (
                                <AvariasDetailDialog ordem={o} />
                              ) : (
                                <span className="text-xs text-muted-foreground">Não</span>
                              )}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-6 flex items-center gap-2 border-t pt-4 flex-wrap">
                          <InformeDialog ordem={o} triggerVariant="outline" />
                          {isAdmin && (
                            <>
                              <EditOrdemDialog ordem={o} onSuccess={onChanged} />
                              {renderDeleteDialog(o)}
                            </>
                          )}
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
