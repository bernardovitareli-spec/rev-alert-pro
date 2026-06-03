import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOficinas, useCreateOficina, useUpdateOficina, useDeleteOficina } from '@/hooks/useOficinas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react';
import { Oficina } from '@/types/fleet';

const oficinaSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(120, 'Máximo 120 caracteres'),
  endereco: z.string().trim().max(250, 'Máximo 250 caracteres').optional(),
  telefone: z.string().trim().max(30, 'Máximo 30 caracteres').optional(),
});
type OficinaForm = z.infer<typeof oficinaSchema>;

const emptyForm: OficinaForm = { nome: '', endereco: '', telefone: '' };

export default function Oficinas() {
  const { data: oficinas, isLoading } = useOficinas();
  const createOficina = useCreateOficina();
  const updateOficina = useUpdateOficina();
  const deleteOficina = useDeleteOficina();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingOficina, setEditingOficina] = useState<Oficina | null>(null);
  const [deletingOficina, setDeletingOficina] = useState<Oficina | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OficinaForm>({
    resolver: zodResolver(oficinaSchema),
    defaultValues: emptyForm,
  });

  const handleOpenCreate = () => {
    setEditingOficina(null);
    reset(emptyForm);
    setFormOpen(true);
  };

  const handleOpenEdit = (oficina: Oficina) => {
    setEditingOficina(oficina);
    reset({
      nome: oficina.nome,
      endereco: oficina.endereco || '',
      telefone: oficina.telefone || '',
    });
    setFormOpen(true);
  };

  const handleOpenDelete = (oficina: Oficina) => {
    setDeletingOficina(oficina);
    setDeleteOpen(true);
  };

  const onSubmit = async (values: OficinaForm) => {
    try {
      if (editingOficina) {
        await updateOficina.mutateAsync({
          id: editingOficina.id,
          nome: values.nome,
          endereco: values.endereco || '',
          telefone: values.telefone || '',
        });
        toast.success('Mecânico atualizado com sucesso!');
      } else {
        await createOficina.mutateAsync({
          nome: values.nome,
          endereco: values.endereco || '',
          telefone: values.telefone || '',
        });
        toast.success('Mecânico criado com sucesso!');
      }
      setFormOpen(false);
    } catch {
      toast.error('Erro ao salvar mecânico');
    }
  };

  const handleDelete = async () => {
    if (!deletingOficina) return;
    try {
      await deleteOficina.mutateAsync(deletingOficina.id);
      toast.success('Mecânico excluído com sucesso!');
      setDeleteOpen(false);
    } catch {
      toast.error('Erro ao excluir mecânico');
    }
  };

  return (
    <AppLayout title="Mecânicos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Gerenciar Mecânicos</h2>
            <p className="text-sm text-muted-foreground">
              Cadastre os mecânicos para associar às revisões em serviço
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Mecânico
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4" />
              Mecânicos Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : oficinas?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum mecânico cadastrado</p>
                <Button variant="outline" className="mt-4" onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" /> Cadastrar primeiro mecânico
                </Button>
              </div>
            ) : (
              <Table>
                <caption className="sr-only">Lista de mecânicos cadastrados com nome, endereço, telefone e ações.</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oficinas?.map((oficina) => (
                    <TableRow key={oficina.id}>
                      <TableCell className="font-medium">{oficina.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{oficina.endereco || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{oficina.telefone || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(oficina)} aria-label="Editar mecânico">
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(oficina)} aria-label="Excluir mecânico">
                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOficina ? 'Editar Mecânico' : 'Novo Mecânico'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  placeholder="Nome do mecânico"
                  aria-invalid={!!errors.nome}
                  {...register('nome')}
                />
                {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  placeholder="Endereço do mecânico"
                  aria-invalid={!!errors.endereco}
                  {...register('endereco')}
                />
                {errors.endereco && <p className="text-xs text-destructive">{errors.endereco.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="(00) 00000-0000"
                  autoComplete="tel"
                  aria-invalid={!!errors.telefone}
                  {...register('telefone')}
                />
                {errors.telefone && <p className="text-xs text-destructive">{errors.telefone.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createOficina.isPending || updateOficina.isPending}>
                {editingOficina ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Mecânico</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o mecânico "{deletingOficina?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
