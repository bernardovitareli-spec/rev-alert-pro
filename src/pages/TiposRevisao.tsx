import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTiposRevisao } from '@/hooks/useFleetData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { TipoRevisao, RevisionUnit } from '@/types/fleet';

const tipoSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(120, 'Máximo 120 caracteres'),
  intervalo_padrao: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) > 0), 'Informe um número inteiro positivo')
    .optional()
    .default(''),
  unidade_padrao: z.enum(['Km', 'Hr']),
});
type TipoForm = z.infer<typeof tipoSchema>;

const emptyForm: TipoForm = { nome: '', intervalo_padrao: '', unidade_padrao: 'Km' };

// Per project memory: native <select> inside modals to avoid Radix portal crashes.
const selectCls =
  'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function TiposRevisao() {
  const { data: tiposRevisao, isLoading } = useTiposRevisao();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoRevisao | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TipoForm>({
    resolver: zodResolver(tipoSchema),
    defaultValues: emptyForm,
  });

  const handleOpenDialog = (tipo?: TipoRevisao) => {
    if (tipo) {
      setEditingTipo(tipo);
      reset({
        nome: tipo.nome,
        intervalo_padrao: tipo.intervalo_padrao?.toString() || '',
        unidade_padrao: (tipo.unidade_padrao as RevisionUnit) || 'Km',
      });
    } else {
      setEditingTipo(null);
      reset(emptyForm);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTipo(null);
    reset(emptyForm);
  };

  const onSubmit = async (values: TipoForm) => {
    const data = {
      nome: values.nome,
      intervalo_padrao: values.intervalo_padrao ? parseInt(values.intervalo_padrao, 10) : null,
      unidade_padrao: values.unidade_padrao,
    };
    try {
      if (editingTipo) {
        const { error } = await supabase.from('tipos_revisao').update(data).eq('id', editingTipo.id);
        if (error) throw error;
        toast({ title: 'Tipo de revisão atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('tipos_revisao').insert(data);
        if (error) throw error;
        toast({ title: 'Tipo de revisão criado com sucesso!' });
      }
      queryClient.invalidateQueries({ queryKey: ['tipos_revisao'] });
      handleCloseDialog();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este tipo de revisão?')) return;
    try {
      const { error } = await supabase.from('tipos_revisao').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Tipo de revisão excluído com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['tipos_revisao'] });
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
            <h1 className="text-3xl font-bold">Tipos de Revisão</h1>
            <p className="text-muted-foreground">Gerencie os tipos de revisão disponíveis</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" /> Novo Tipo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogHeader>
                  <DialogTitle>{editingTipo ? 'Editar Tipo de Revisão' : 'Novo Tipo de Revisão'}</DialogTitle>
                  <DialogDescription>
                    {editingTipo ? 'Atualize as informações do tipo de revisão.' : 'Preencha as informações para criar um novo tipo.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Troca de Óleo"
                      aria-invalid={!!errors.nome}
                      {...register('nome')}
                    />
                    {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="intervalo">Intervalo Padrão</Label>
                      <Input
                        id="intervalo"
                        type="number"
                        min={1}
                        placeholder="Ex: 10000"
                        aria-invalid={!!errors.intervalo_padrao}
                        {...register('intervalo_padrao')}
                      />
                      {errors.intervalo_padrao && (
                        <p className="text-xs text-destructive">{errors.intervalo_padrao.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unidade">Unidade</Label>
                      <select id="unidade" className={selectCls} translate="no" {...register('unidade_padrao')}>
                        <option value="Km">Quilômetros (Km)</option>
                        <option value="Hr">Horas (Hr)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : editingTipo ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Tipos Cadastrados ({tiposRevisao?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tiposRevisao && tiposRevisao.length > 0 ? (
              <Table>
                <caption className="sr-only">Lista de tipos de revisão cadastrados com intervalo padrão, unidade e ações.</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Intervalo Padrão</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiposRevisao.map((tipo) => (
                    <TableRow key={tipo.id}>
                      <TableCell className="font-medium">{tipo.nome}</TableCell>
                      <TableCell>
                        {tipo.intervalo_padrao ? tipo.intervalo_padrao.toLocaleString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell>{tipo.unidade_padrao || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(tipo)} aria-label="Editar tipo de revisão">
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(tipo.id)} aria-label="Excluir tipo de revisão">
                          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum tipo de revisão cadastrado.</p>
                <p className="text-sm">Clique em "Novo Tipo" para começar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
