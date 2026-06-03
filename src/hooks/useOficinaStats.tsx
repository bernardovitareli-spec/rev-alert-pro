import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OficinaStats } from '@/types/fleet';

export function useOficinaStats() {
  return useQuery({
    queryKey: ['oficina_stats'],
    queryFn: async () => {
      // Fetch oficinas
      const { data: oficinas, error: oficinasError } = await supabase
        .from('oficinas')
        .select('*')
        .order('nome');

      if (oficinasError) throw oficinasError;

      // Fetch historico para calcular stats
      const { data: historico, error: historicoError } = await supabase
        .from('historico_revisoes')
        .select('oficina_id, valor, tempo_servico_dias, data_realizacao');

      if (historicoError) throw historicoError;


      // Calculate stats for each oficina
      const stats: OficinaStats[] = (oficinas || []).map(oficina => {
        const oficinHistorico = historico?.filter(h => h.oficina_id === oficina.id) || [];
        
        const totalServicos = oficinHistorico.length;
        const totalGasto = oficinHistorico.reduce((sum, h) => sum + (h.valor || 0), 0);
        
        // Tempo médio
        const tempos = oficinHistorico
          .map(h => h.tempo_servico_dias)
          .filter(t => t !== null && t !== undefined) as number[];
        const tempoMedioDias = tempos.length > 0
          ? tempos.reduce((a, b) => a + b, 0) / tempos.length
          : 0;

        // Taxa de atraso (serviços que terminaram depois da previsão)
        // Esta é uma simplificação - na prática precisaria comparar datas
        const taxaAtraso = 0; // Placeholder, poderia ser calculado se tivéssemos data de início

        return {
          id: oficina.id,
          nome: oficina.nome,
          endereco: oficina.endereco,
          telefone: oficina.telefone,
          totalServicos,
          totalGasto,
          tempoMedioDias: Number(tempoMedioDias.toFixed(1)),
          taxaAtraso,
        };
      });

      // Sort by total serviços
      return stats.sort((a, b) => b.totalServicos - a.totalServicos);
    },
  });
}
