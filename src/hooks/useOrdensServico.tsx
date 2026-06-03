import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OrdemServico, AvariaFoto, StatusOrdemServico } from '@/types/fleet';

export function useOrdensServico() {
  return useQuery({
    queryKey: ['ordens_servico'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*, veiculo:veiculos(id, placa_serie, tag_obra, empresa:empresas(nome)), tipo_revisao:tipos_revisao(id, nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as (OrdemServico & { veiculo: { id: string; placa_serie: string; tag_obra: string | null; empresa: { nome: string } | null } })[];
    },
  });
}

export interface OrdensServicoFilters {
  veiculoId?: string | null;
  status?: StatusOrdemServico | 'all';
  tipo?: 'preventiva' | 'corretiva' | 'all';
  dataInicio?: string | null; // yyyy-mm-dd
  dataFim?: string | null;    // yyyy-mm-dd
}

export function useOrdensServicoPaginated(
  page: number,
  pageSize: number,
  filters: OrdensServicoFilters,
) {
  return useQuery({
    queryKey: ['ordens_servico_paginated', page, pageSize, filters],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from('ordens_servico')
        .select(
          '*, veiculo:veiculos(id, placa_serie, tag_obra, empresa:empresas(nome)), tipo_revisao:tipos_revisao(id, nome)',
          { count: 'exact' },
        )
        .order('data_entrada', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters.veiculoId && filters.veiculoId !== 'all') {
        q = q.eq('veiculo_id', filters.veiculoId);
      }
      if (filters.status && filters.status !== 'all') {
        q = q.eq('status', filters.status);
      }
      if (filters.tipo && filters.tipo !== 'all') {
        q = q.eq('tipo_manutencao', filters.tipo);
      }
      if (filters.dataInicio) {
        q = q.gte('data_entrada', filters.dataInicio);
      }
      if (filters.dataFim) {
        q = q.lte('data_entrada', filters.dataFim);
      }

      const { data, error, count } = await q.range(from, to);
      if (error) throw error;
      return {
        rows: (data ?? []) as any[],
        total: count ?? 0,
      };
    },
    placeholderData: (prev) => prev,
  });
}


export function useCreateOrdemServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (os: {
      veiculo_id: string;
      tipo_manutencao: string;
      subcategoria_corretiva?: string | null;
      detalhamento?: string | null;
      tipo_revisao_id?: string | null;
      data_entrada: string;
      km_entrada?: number | null;
      horimetro_entrada?: number | null;
      tem_avarias: boolean;
      descricao_avarias?: string | null;
      previsao_saida?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .insert(os as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ordens_servico'] }),
  });
}

export function useUpdateOrdemServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from('ordens_servico')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ordens_servico'] }),
  });
}

export function useAvariasFotos(ordemServicoId: string | null) {
  return useQuery({
    queryKey: ['avarias_fotos', ordemServicoId],
    enabled: !!ordemServicoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avarias_fotos')
        .select('*')
        .eq('ordem_servico_id', ordemServicoId!)
        .order('created_at');
      if (error) throw error;
      return data as unknown as AvariaFoto[];
    },
  });
}

export function useDeleteOrdemServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete related avarias_fotos first
      await supabase.from('avarias_fotos').delete().eq('ordem_servico_id', id);
      const { error } = await supabase.from('ordens_servico').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ordens_servico'] }),
  });
}

export function useUploadAvariaFoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ordemServicoId, file }: { ordemServicoId: string; file: File }) => {
      const ext = file.name.split('.').pop();
      const path = `${ordemServicoId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avarias-fotos')
        .upload(path, file);
      if (uploadError) throw uploadError;

      // Armazena apenas o path; signed URL é gerada sob demanda.
      const { error } = await supabase
        .from('avarias_fotos')
        .insert({ ordem_servico_id: ordemServicoId, foto_url: path } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['avarias_fotos'] }),
  });
}
