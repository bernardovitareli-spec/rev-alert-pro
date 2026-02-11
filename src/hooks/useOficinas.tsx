import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Oficina } from '@/types/fleet';

export function useOficinas() {
  return useQuery({
    queryKey: ['oficinas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oficinas')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as Oficina[];
    },
  });
}

export function useCreateOficina() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { nome: string; endereco?: string; telefone?: string }) => {
      const { error } = await supabase
        .from('oficinas')
        .insert({
          nome: data.nome,
          endereco: data.endereco || null,
          telefone: data.telefone || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oficinas'] });
    },
  });
}

export function useUpdateOficina() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; nome: string; endereco?: string; telefone?: string }) => {
      const { error } = await supabase
        .from('oficinas')
        .update({
          nome: data.nome,
          endereco: data.endereco || null,
          telefone: data.telefone || null,
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oficinas'] });
    },
  });
}

export function useDeleteOficina() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('oficinas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oficinas'] });
    },
  });
}
