import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Empresa, TipoRevisao, Veiculo, Revisao, VeiculoComRevisoes, DashboardStats, ExecutionStatus } from '@/types/fleet';
import { calcularStatusVeiculo, ordenarPorUrgencia } from '@/lib/revisionCalculations';

// Fetch all empresas
export function useEmpresas() {
  return useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as Empresa[];
    },
  });
}

// Fetch all tipos de revisao
export function useTiposRevisao() {
  return useQuery({
    queryKey: ['tipos_revisao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipos_revisao')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as TipoRevisao[];
    },
  });
}

// Fetch all veiculos with empresas
export function useVeiculos() {
  return useQuery({
    queryKey: ['veiculos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select(`
          *,
          empresa:empresas(*)
        `)
        .order('placa_serie');
      
      if (error) throw error;
      return data as Veiculo[];
    },
  });
}

// Fetch all revisoes with related data
export function useRevisoes() {
  return useQuery({
    queryKey: ['revisoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revisoes')
        .select(`
          *,
          veiculo:veiculos(*),
          tipo_revisao:tipos_revisao(*),
          oficina:oficinas(*)
        `);
      
      if (error) throw error;
      return data as Revisao[];
    },
  });
}

// Fetch vehicles with all revisions and calculated status
export function useVeiculosComRevisoes() {
  const { data: veiculos, isLoading: veiculosLoading, error: veiculosError } = useVeiculos();
  const { data: revisoes, isLoading: revisoesLoading, error: revisoesError } = useRevisoes();
  const { data: tiposRevisao } = useTiposRevisao();

  const isLoading = veiculosLoading || revisoesLoading;
  const error = veiculosError || revisoesError;

  // Memoize the computed vehicles to prevent unnecessary recalculations
  const veiculosOrdenados = useMemo(() => {
    if (!veiculos || !revisoes) return undefined;
    
    const veiculosComRevisoes: VeiculoComRevisoes[] = veiculos.map(veiculo => {
      const revisoesVeiculo = revisoes.filter(r => r.veiculo_id === veiculo.id);
      const veiculoComRevisoes = calcularStatusVeiculo(veiculo, revisoesVeiculo);
      
      // Add tipo_revisao and oficina info to each revisao
      veiculoComRevisoes.revisoes = veiculoComRevisoes.revisoes.map(rev => {
        const original = revisoes.find(r => r.id === rev.id);
        return {
          ...rev,
          tipo_revisao: tiposRevisao?.find(t => t.id === rev.tipo_revisao_id),
          oficina: original?.oficina,
        };
      });
      
      return veiculoComRevisoes;
    });

    return ordenarPorUrgencia(veiculosComRevisoes);
  }, [veiculos, revisoes, tiposRevisao]);

  return {
    data: veiculosOrdenados,
    isLoading,
    error,
  };
}

// Calculate dashboard stats
export function useDashboardStats() {
  const { data: veiculosComRevisoes, isLoading, error } = useVeiculosComRevisoes();

  // Memoize stats to prevent unnecessary recalculations
  const stats = useMemo((): DashboardStats | undefined => {
    if (!veiculosComRevisoes) return undefined;
    
    return {
      totalVeiculos: veiculosComRevisoes.length,
      veiculosCriticos: veiculosComRevisoes.filter(v => v.statusGeral === 'critical').length,
      veiculosAtencao: veiculosComRevisoes.filter(v => v.statusGeral === 'warning').length,
      veiculosOk: veiculosComRevisoes.filter(v => v.statusGeral === 'ok').length,
      revisoesCriticas: veiculosComRevisoes.reduce((sum, v) => sum + v.revisoesCriticas, 0),
      revisoesAtencao: veiculosComRevisoes.reduce((sum, v) => sum + v.revisoesAtencao, 0),
      revisoesOk: veiculosComRevisoes.reduce((sum, v) => sum + v.revisoesOk, 0),
    };
  }, [veiculosComRevisoes]);

  return { data: stats, isLoading, error };
}

// Mutation to update vehicle km/hora, documents and validity dates
export function useUpdateVeiculo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      km_atual, 
      hora_atual,
      crlv_url,
      tacografo_url,
      documento_url,
      crlv_validade,
      tacografo_validade,
      tag_obra,
      empresa_id,
      contrato,
      contrato_id,
    }: { 
      id: string; 
      km_atual?: number; 
      hora_atual?: number;
      crlv_url?: string | null;
      tacografo_url?: string | null;
      documento_url?: string | null;
      crlv_validade?: string | null;
      tacografo_validade?: string | null;
      tag_obra?: string | null;
      empresa_id?: string | null;
      contrato?: string | null;
      contrato_id?: string | null;
    }) => {
      const updateData: Record<string, any> = {};
      
      if (km_atual !== undefined) updateData.km_atual = km_atual;
      if (hora_atual !== undefined) updateData.hora_atual = hora_atual;
      if (crlv_url !== undefined) updateData.crlv_url = crlv_url;
      if (tacografo_url !== undefined) updateData.tacografo_url = tacografo_url;
      if (documento_url !== undefined) updateData.documento_url = documento_url;
      if (crlv_validade !== undefined) updateData.crlv_validade = crlv_validade;
      if (tacografo_validade !== undefined) updateData.tacografo_validade = tacografo_validade;
      if (tag_obra !== undefined) updateData.tag_obra = tag_obra;
      if (empresa_id !== undefined) updateData.empresa_id = empresa_id;
      if (contrato !== undefined) updateData.contrato = contrato;
      if (contrato_id !== undefined) updateData.contrato_id = contrato_id;
      
      // Only add ultima_atualizacao if km or hora was updated
      if (km_atual !== undefined || hora_atual !== undefined) {
        updateData.ultima_atualizacao = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('veiculos')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['revisoes'] });
      queryClient.invalidateQueries({ queryKey: ['veiculo'] });
      queryClient.invalidateQueries({ queryKey: ['documentos_vencidos'] });
    },
  });
}

// Fetch a single vehicle with its revisions
export function useVeiculoDetalhe(id: string) {
  const { data: tiposRevisao } = useTiposRevisao();
  
  return useQuery({
    queryKey: ['veiculo', id],
    queryFn: async () => {
      const { data: veiculo, error: veiculoError } = await supabase
        .from('veiculos')
        .select(`
          *,
          empresa:empresas(*)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (veiculoError) throw veiculoError;
      if (!veiculo) return null;

      const { data: revisoes, error: revisoesError } = await supabase
        .from('revisoes')
        .select(`
          *,
          tipo_revisao:tipos_revisao(*),
          oficina:oficinas(*)
        `)
        .eq('veiculo_id', id);
      
      if (revisoesError) throw revisoesError;

      // Calculate status for vehicle with its revisions
      const veiculoComRevisoes = calcularStatusVeiculo(veiculo as Veiculo, revisoes as Revisao[]);
      
      // Add tipo_revisao and oficina info to each revisao
      veiculoComRevisoes.revisoes = veiculoComRevisoes.revisoes.map(rev => {
        const original = revisoes.find(r => r.id === rev.id);
        return {
          ...rev,
          tipo_revisao: tiposRevisao?.find(t => t.id === rev.tipo_revisao_id),
          oficina: original?.oficina ?? undefined,
        };
      });

      return veiculoComRevisoes;
    },
    enabled: !!id && !!tiposRevisao,
  });
}

// Mutation to mark revision as done
export function useMarcarRevisaoRealizada() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      revisaoId, 
      kmAtual, 
      horaAtual 
    }: { 
      revisaoId: string; 
      kmAtual: number; 
      horaAtual: number;
    }) => {
      const { data: revisao, error: fetchError } = await supabase
        .from('revisoes')
        .select('unidade')
        .eq('id', revisaoId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('revisoes')
        .update({ 
          data_revisao: new Date().toISOString().split('T')[0],
          km_revisao: revisao.unidade === 'Km' ? kmAtual : null,
          hora_revisao: revisao.unidade === 'Hr' ? horaAtual : null,
          status_execucao: 'realizada',
        })
        .eq('id', revisaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisoes'] });
      queryClient.invalidateQueries({ queryKey: ['veiculo'] });
    },
  });
}

// Mutation to update execution status
export function useUpdateStatusExecucao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      revisaoId, 
      statusExecucao,
      previsaoEntrega,
      oficinaId,
      ordemServico,
      notaFiscalUrl,
      valor,
      observacoes,
    }: { 
      revisaoId: string; 
      statusExecucao?: ExecutionStatus;
      previsaoEntrega?: string | null;
      oficinaId?: string | null;
      ordemServico?: string | null;
      notaFiscalUrl?: string | null;
      valor?: number | null;
      observacoes?: string | null;
    }) => {
      const updateData: Record<string, any> = {};
      if (statusExecucao !== undefined) updateData.status_execucao = statusExecucao;
      if (previsaoEntrega !== undefined) updateData.previsao_entrega = previsaoEntrega;
      if (oficinaId !== undefined) updateData.oficina_id = oficinaId;
      if (ordemServico !== undefined) updateData.ordem_servico = ordemServico;
      if (notaFiscalUrl !== undefined) updateData.nota_fiscal_url = notaFiscalUrl;
      if (valor !== undefined) updateData.valor = valor;
      if (observacoes !== undefined) updateData.observacoes = observacoes;

      const { error } = await supabase
        .from('revisoes')
        .update(updateData)
        .eq('id', revisaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisoes'] });
      queryClient.invalidateQueries({ queryKey: ['veiculo'] });
      queryClient.invalidateQueries({ queryKey: ['fleet_analytics'] });
      queryClient.invalidateQueries({ queryKey: ['historico_revisoes'] });
    },
  });
}
