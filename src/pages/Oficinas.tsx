import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOficinas, useCreateOficina, useUpdateOficina, useDeleteOficina } from '@/hooks/useOficinas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react';
import { Oficina } from '@/types/fleet';

interface FormData {
  nome: string;
  endereco: string;
  telefone: string;
}

const initialFormData: FormData = {
  nome: '',
  endereco: '',
  telefone: '',
};

export default function Oficinas() {
  const { data: oficinas, isLoading } = useOficinas();
  const createOficina = useCreateOficina();
  const updateOficina = useUpdateOficina();
  const deleteOficina = useDeleteOficina();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingOficina, setEditingOficina] = useState<Oficina | null>(null);
  const [deletingOficina, setDeletingOficina] = useState<Oficina | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleOpenCreate = () => {
    setEditingOficina(null);
    setFormData(initialFormData);
    setFormOpen(true);
  };

  const handleOpenEdit = (oficina: Oficina) => {
    setEditingOficina(oficina);
    setFormData({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editingOficina) {
        await updateOficina.mutateAsync({
          id: editingOficina.id,
          ...formData,
        });
        toast.success('Mecânico atualizado com sucesso!');
      } else {
        await createOficina.mutateAsync(formData);
        toast.success('Mecânico criado com sucesso!');
      }
      setFormOpen(false);
    } catch (_err) {
      toast.error('Erro ao salvar mecânico');
    }
  };

  const handleDelete = async () => {
    if (!deletingOficina) return;

    try {
      await deleteOficina.mutateAsync(deletingOficina.id);
      toast.success('Mecânico excluído com sucesso!');
      setDeleteOpen(false);
    } catch (_err) {
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
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar primeiro mecânico
                </Button>
              </div>
            ) : (
              <Table>
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
                      <TableCell className="text-muted-foreground">
                        {oficina.endereco || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {oficina.telefone || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(oficina)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(oficina)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
          <DialogTitle>
              {editingOficina ? 'Editar Mecânico' : 'Novo Mecânico'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do mecânico"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Endereço do mecânico"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createOficina.isPending || updateOficina.isPending}
              >
                {editingOficina ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
