import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OrdemServico, AvariaFoto } from '@/types/fleet';

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

      const { data: urlData } = supabase.storage
        .from('avarias-fotos')
        .getPublicUrl(path);

      const { error } = await supabase
        .from('avarias_fotos')
        .insert({ ordem_servico_id: ordemServicoId, foto_url: urlData.publicUrl } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['avarias_fotos'] }),
  });
}
