import { useState } from 'react';
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTiposRevisao } from '@/hooks/useFleetData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { TipoRevisao, RevisionUnit } from '@/types/fleet';

export default function TiposRevisao() {
  const { data: tiposRevisao, isLoading } = useTiposRevisao();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoRevisao | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    intervalo_padrao: '',
    unidade_padrao: 'Km' as RevisionUnit,
  });

  const resetForm = () => {
    setFormData({ nome: '', intervalo_padrao: '', unidade_padrao: 'Km' });
    setEditingTipo(null);
  };

  const handleOpenDialog = (tipo?: TipoRevisao) => {
    if (tipo) {
      setEditingTipo(tipo);
      setFormData({
        nome: tipo.nome,
        intervalo_padrao: tipo.intervalo_padrao?.toString() || '',
        unidade_padrao: tipo.unidade_padrao || 'Km',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      nome: formData.nome,
      intervalo_padrao: formData.intervalo_padrao ? parseInt(formData.intervalo_padrao) : null,
      unidade_padrao: formData.unidade_padrao,
    };

    try {
      if (editingTipo) {
        const { error } = await supabase
          .from('tipos_revisao')
          .update(data)
          .eq('id', editingTipo.id);
        
        if (error) throw error;
        toast({ title: 'Tipo de revisão atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('tipos_revisao')
          .insert(data);
        
        if (error) throw error;
        toast({ title: 'Tipo de revisão criado com sucesso!' });
      }
      
      queryClient.invalidateQueries({ queryKey: ['tipos_revisao'] });
      handleCloseDialog();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao salvar', 
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este tipo de revisão?')) return;
    
    try {
      const { error } = await supabase
        .from('tipos_revisao')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: 'Tipo de revisão excluído com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['tipos_revisao'] });
    } catch (error: any) {
      toast({ 
        title: 'Erro ao excluir', 
        description: error.message,
        variant: 'destructive'
      });
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
                <Plus className="h-4 w-4 mr-2" />
                Novo Tipo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingTipo ? 'Editar Tipo de Revisão' : 'Novo Tipo de Revisão'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTipo ? 'Atualize as informações do tipo de revisão.' : 'Preencha as informações para criar um novo tipo.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Troca de Óleo"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="intervalo">Intervalo Padrão</Label>
                      <Input
                        id="intervalo"
                        type="number"
                        value={formData.intervalo_padrao}
                        onChange={(e) => setFormData(prev => ({ ...prev, intervalo_padrao: e.target.value }))}
                        placeholder="Ex: 10000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unidade">Unidade</Label>
                      <Select 
                        value={formData.unidade_padrao} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, unidade_padrao: v as RevisionUnit }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Km">Quilômetros (Km)</SelectItem>
                          <SelectItem value="Hr">Horas (Hr)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingTipo ? 'Salvar' : 'Criar'}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(tipo)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(tipo.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
