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


/**
 * Sincroniza os dados de utilização do veículo (km_atual, hora_atual,
 * ultima_atualizacao) a partir de uma ordem de serviço.
 * - Usa o maior valor entre entrada e saída.
 * - Só atualiza se o novo valor for maior que o atual (evita regressões).
 * - Data de referência: data_saida || data_entrada.
 */
async function syncVeiculoFromOrdem(veiculoId: string) {
  if (!veiculoId) return;
  // Busca o estado mais recente da OS e do veículo
  const [{ data: ordens }, { data: veiculo }] = await Promise.all([
    supabase
      .from('ordens_servico')
      .select('km_entrada, km_saida, horimetro_entrada, horimetro_saida, data_entrada, data_saida')
      .eq('veiculo_id', veiculoId),
    supabase
      .from('veiculos')
      .select('km_atual, hora_atual, ultima_atualizacao')
      .eq('id', veiculoId)
      .maybeSingle(),
  ]);
  if (!ordens || ordens.length === 0) return;

  let maxKm: number | null = null;
  let maxHor: number | null = null;
  let latestDate: string | null = null;
  for (const o of ordens as any[]) {
    const km = Math.max(Number(o.km_saida ?? 0) || 0, Number(o.km_entrada ?? 0) || 0);
    const hr = Math.max(Number(o.horimetro_saida ?? 0) || 0, Number(o.horimetro_entrada ?? 0) || 0);
    const dt = (o.data_saida || o.data_entrada) as string | null;
    if (km > 0 && (maxKm === null || km > maxKm)) maxKm = km;
    if (hr > 0 && (maxHor === null || hr > maxHor)) maxHor = hr;
    if (dt && (!latestDate || dt > latestDate)) latestDate = dt;
  }

  const patch: Record<string, any> = {};
  if (maxKm !== null && maxKm > Number(veiculo?.km_atual ?? 0)) patch.km_atual = maxKm;
  if (maxHor !== null && maxHor > Number(veiculo?.hora_atual ?? 0)) patch.hora_atual = maxHor;
  if (latestDate && (!veiculo?.ultima_atualizacao || latestDate > String(veiculo.ultima_atualizacao).slice(0, 10))) {
    patch.ultima_atualizacao = latestDate;
  }
  if (Object.keys(patch).length === 0) return;
  await supabase.from('veiculos').update(patch).eq('id', veiculoId);
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
      await syncVeiculoFromOrdem(os.veiculo_id);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ordens_servico'] });
      qc.invalidateQueries({ queryKey: ['ordens_servico_paginated'] });
      qc.invalidateQueries({ queryKey: ['veiculos'] });
    },
  });
}

export function useUpdateOrdemServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .update(updates as any)
        .eq('id', id)
        .select('veiculo_id')
        .single();
      if (error) throw error;
      if (data?.veiculo_id) await syncVeiculoFromOrdem(data.veiculo_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ordens_servico'] });
      qc.invalidateQueries({ queryKey: ['ordens_servico_paginated'] });
      qc.invalidateQueries({ queryKey: ['veiculos'] });
    },
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ordens_servico'] }); qc.invalidateQueries({ queryKey: ['ordens_servico_paginated'] }); },
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
