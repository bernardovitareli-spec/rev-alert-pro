import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Contrato {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
}

export function useContratos(empresaId?: string) {
  return useQuery({
    queryKey: ['contratos', empresaId],
    queryFn: async () => {
      let query = supabase
        .from('contratos')
        .select('*')
        .order('nome');

      if (empresaId) {
        query = query.eq('empresa_id', empresaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contrato[];
    },
  });
}

export function useCreateContrato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      empresa_id,
      nome,
      descricao,
    }: {
      empresa_id: string;
      nome: string;
      descricao?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('contratos')
        .insert({ empresa_id, nome, descricao: descricao || null })
        .select()
        .single();

      if (error) throw error;
      return data as Contrato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
  });
}

export function useUpdateContrato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      nome,
      descricao,
    }: {
      id: string;
      nome: string;
      descricao?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('contratos')
        .update({ nome, descricao: descricao || null })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Contrato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
  });
}

export function useDeleteContrato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contratos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['veiculo'] });
    },
  });
}
