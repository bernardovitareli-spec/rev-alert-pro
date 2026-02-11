import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HistoricoRevisao } from '@/types/fleet';

export function useHistoricoRevisoes(veiculoId?: string) {
  return useQuery({
    queryKey: ['historico_revisoes', veiculoId],
    queryFn: async () => {
      let query = supabase
        .from('historico_revisoes')
        .select(`
          *,
          veiculo:veiculos(*),
          tipo_revisao:tipos_revisao(*),
          oficina:oficinas(*)
        `)
        .order('data_realizacao', { ascending: false });

      if (veiculoId) {
        query = query.eq('veiculo_id', veiculoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HistoricoRevisao[];
    },
    enabled: true,
  });
}

export function useHistoricoByOficina(oficinaId?: string) {
  return useQuery({
    queryKey: ['historico_revisoes_oficina', oficinaId],
    queryFn: async () => {
      let query = supabase
        .from('historico_revisoes')
        .select(`
          *,
          veiculo:veiculos(placa_serie, tag_obra),
          tipo_revisao:tipos_revisao(nome)
        `)
        .order('data_realizacao', { ascending: false });

      if (oficinaId) {
        query = query.eq('oficina_id', oficinaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HistoricoRevisao[];
    },
    enabled: !!oficinaId,
  });
}

export function useCreateHistoricoRevisao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (historico: Omit<HistoricoRevisao, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('historico_revisoes')
        .insert(historico)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico_revisoes'] });
    },
  });
}
