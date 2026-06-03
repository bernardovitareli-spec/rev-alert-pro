import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Building2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEmpresas } from '@/hooks/useFleetData';
import { useContratos, useCreateContrato, useUpdateContrato, useDeleteContrato, Contrato } from '@/hooks/useContratos';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Empresa } from '@/types/fleet';

const empresaSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(120, 'Máximo 120 caracteres'),
});
type EmpresaForm = z.infer<typeof empresaSchema>;

const contratoSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(120, 'Máximo 120 caracteres'),
  descricao: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
});
type ContratoForm = z.infer<typeof contratoSchema>;

function EmpresaContratosRow({
  empresa,
  onEditEmpresa,
  onDeleteEmpresa,
}: {
  empresa: Empresa;
  onEditEmpresa: (empresa: Empresa) => void;
  onDeleteEmpresa: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isContratoDialogOpen, setIsContratoDialogOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);

  const { data: contratos, isLoading: contratosLoading } = useContratos(empresa.id);
  const createContrato = useCreateContrato();
  const updateContrato = useUpdateContrato();
  const deleteContrato = useDeleteContrato();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContratoForm>({
    resolver: zodResolver(contratoSchema),
    defaultValues: { nome: '', descricao: '' },
  });

  const handleOpenContratoDialog = (contrato?: Contrato) => {
    if (contrato) {
      setEditingContrato(contrato);
      reset({ nome: contrato.nome, descricao: contrato.descricao || '' });
    } else {
      setEditingContrato(null);
      reset({ nome: '', descricao: '' });
    }
    setIsContratoDialogOpen(true);
  };

  const handleCloseContratoDialog = () => {
    setIsContratoDialogOpen(false);
    setEditingContrato(null);
    reset({ nome: '', descricao: '' });
  };

  const onSubmitContrato = async (values: ContratoForm) => {
    try {
      if (editingContrato) {
        await updateContrato.mutateAsync({
          id: editingContrato.id,
          nome: values.nome,
          descricao: values.descricao || null,
        });
        toast({ title: 'Contrato atualizado com sucesso!' });
      } else {
        await createContrato.mutateAsync({
          empresa_id: empresa.id,
          nome: values.nome,
          descricao: values.descricao || null,
        });
        toast({ title: 'Contrato criado com sucesso!' });
        setExpanded(true);
      }
      handleCloseContratoDialog();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({ title: 'Erro ao salvar contrato', description: msg, variant: 'destructive' });
    }
  };

  const handleDeleteContrato = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contrato? Os veículos vinculados perderão a associação.')) return;
    try {
      await deleteContrato.mutateAsync(id);
      toast({ title: 'Contrato excluído com sucesso!' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({ title: 'Erro ao excluir contrato', description: msg, variant: 'destructive' });
    }
  };

  const isPending = createContrato.isPending || updateContrato.isPending;

  return (
    <>
      <TableRow className="hover:bg-muted/30">
        <TableCell>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 font-medium hover:text-primary transition-colors"
          >
            {expanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            {empresa.nome}
            {contratos && contratos.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {contratos.length}
              </span>
            )}
          </button>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {new Date(empresa.created_at).toLocaleDateString('pt-BR')}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditEmpresa(empresa)} aria-label="Editar empresa">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDeleteEmpresa(empresa.id)} aria-label="Excluir empresa">
              <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8 ml-1" onClick={() => handleOpenContratoDialog()}>
              <Plus className="h-3 w-3 mr-1" /> Novo Contrato
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <>
          {contratosLoading ? (
            <TableRow>
              <TableCell colSpan={3} className="py-2 pl-10">
                <span className="text-sm text-muted-foreground">Carregando contratos...</span>
              </TableCell>
            </TableRow>
          ) : contratos && contratos.length > 0 ? (
            contratos.map((contrato) => (
              <TableRow key={contrato.id} className="bg-muted/20 hover:bg-muted/40">
                <TableCell className="pl-10">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">└──</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{contrato.nome}</span>
                      </div>
                      {contrato.descricao && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-5">{contrato.descricao}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(contrato.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenContratoDialog(contrato)} aria-label="Editar contrato">
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteContrato(contrato.id)} aria-label="Excluir contrato">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="py-2 pl-10 text-sm text-muted-foreground italic">
                <span className="ml-8">(Nenhum contrato cadastrado)</span>
              </TableCell>
            </TableRow>
          )}
        </>
      )}

      <Dialog open={isContratoDialogOpen} onOpenChange={setIsContratoDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmitContrato)} noValidate>
            <DialogHeader>
              <DialogTitle>
                {editingContrato ? 'Editar Contrato' : `Novo Contrato — ${empresa.nome}`}
              </DialogTitle>
              <DialogDescription>
                {editingContrato
                  ? 'Atualize os dados do contrato.'
                  : `Preencha os dados para criar um contrato vinculado à empresa ${empresa.nome}.`}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`nome-${empresa.id}`}>Nome do Contrato *</Label>
                <Input
                  id={`nome-${empresa.id}`}
                  placeholder="Ex: Contrato 001 - Terraplanagem S11D"
                  aria-invalid={!!errors.nome}
                  {...register('nome')}
                />
                {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`descricao-${empresa.id}`}>Descrição (opcional)</Label>
                <Textarea
                  id={`descricao-${empresa.id}`}
                  placeholder="Descrição adicional do contrato..."
                  rows={3}
                  aria-invalid={!!errors.descricao}
                  {...register('descricao')}
                />
                {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseContratoDialog}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvando...' : editingContrato ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Empresas() {
  const { data: empresas, isLoading } = useEmpresas();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isEmpresaDialogOpen, setIsEmpresaDialogOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmpresaForm>({
    resolver: zodResolver(empresaSchema),
    defaultValues: { nome: '' },
  });

  const handleOpenDialog = (empresa?: Empresa) => {
    if (empresa) {
      setEditingEmpresa(empresa);
      reset({ nome: empresa.nome });
    } else {
      setEditingEmpresa(null);
      reset({ nome: '' });
    }
    setIsEmpresaDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsEmpresaDialogOpen(false);
    setEditingEmpresa(null);
    reset({ nome: '' });
  };

  const onSubmit = async (values: EmpresaForm) => {
    try {
      if (editingEmpresa) {
        const { error } = await supabase.from('empresas').update({ nome: values.nome }).eq('id', editingEmpresa.id);
        if (error) throw error;
        toast({ title: 'Empresa atualizada com sucesso!' });
      } else {
        const { error } = await supabase.from('empresas').insert({ nome: values.nome });
        if (error) throw error;
        toast({ title: 'Empresa criada com sucesso!' });
      }
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      handleCloseDialog();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Todos os contratos vinculados também serão excluídos.')) return;
    try {
      const { error } = await supabase.from('empresas').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Empresa excluída com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({ title: 'Erro ao excluir', description: msg, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Empresas</h1>
            <p className="text-muted-foreground">Gerencie as empresas e seus contratos</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" /> Nova Empresa
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Empresas Cadastradas ({empresas?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {empresas && empresas.length > 0 ? (
              <Table>
                <caption className="sr-only">Lista de empresas cadastradas com nome, data de criação e ações disponíveis.</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas.map((empresa) => (
                    <EmpresaContratosRow
                      key={empresa.id}
                      empresa={empresa}
                      onEditEmpresa={handleOpenDialog}
                      onDeleteEmpresa={handleDelete}
                    />
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma empresa cadastrada.</p>
                <p className="text-sm">Clique em "Nova Empresa" para começar.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isEmpresaDialogOpen} onOpenChange={setIsEmpresaDialogOpen}>
          <DialogContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <DialogHeader>
                <DialogTitle>{editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
                <DialogDescription>
                  {editingEmpresa ? 'Atualize o nome da empresa.' : 'Preencha o nome da nova empresa.'}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Empresa</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: CIVIL S11D"
                    aria-invalid={!!errors.nome}
                    {...register('nome')}
                  />
                  {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : editingEmpresa ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
