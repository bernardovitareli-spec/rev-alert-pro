import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { calcularStatusRevisao } from '@/lib/revisionCalculations';
import type { Revisao } from '@/types/fleet';

export interface ForecastData {
  periodo30: {
    quantidade: number;
    custoEstimado: number;
  };
  periodo60: {
    quantidade: number;
    custoEstimado: number;
  };
  periodo90: {
    quantidade: number;
    custoEstimado: number;
  };
  proximaSemana: number;
  proximoMes: number;
  picosSemana: { dia: string; quantidade: number }[];
}

export interface DocumentForecast {
  vencendo30: number;
  vencendo60: number;
  vencendo90: number;
  vencidos: number;
}

export function useForecast() {
  return useQuery({
    queryKey: ['forecast'],
    queryFn: async (): Promise<ForecastData> => {
      const hoje = startOfDay(new Date());
      const em30dias = addDays(hoje, 30);
      const em60dias = addDays(hoje, 60);
      const em90dias = addDays(hoje, 90);
      const em7dias = addDays(hoje, 7);

      const [
        { data: veiculos },
        { data: revisoes },
        { data: tiposRevisao },
        { data: historico }
      ] = await Promise.all([
        supabase.from('veiculos').select('id, km_atual, hora_atual'),
        supabase.from('revisoes').select('*'),
        supabase.from('tipos_revisao').select('id, nome'),
        supabase.from('historico_revisoes').select('tipo_revisao_id, valor')
      ]);

      const veiculosList = veiculos || [];
      const revisoesList = (revisoes || []) as Revisao[];
      const historicoList = historico || [];

      // Calcular custo médio por tipo de revisão
      const custoMedioPorTipo = historicoList.reduce((acc, h) => {
        if (!acc[h.tipo_revisao_id]) {
          acc[h.tipo_revisao_id] = { total: 0, count: 0 };
        }
        acc[h.tipo_revisao_id].total += h.valor || 0;
        acc[h.tipo_revisao_id].count++;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);

      const getCustoEstimado = (tipoId: string): number => {
        const dados = custoMedioPorTipo[tipoId];
        if (dados && dados.count > 0) return dados.total / dados.count;
        return 500; // Valor default se não houver histórico
      };

      // Mapear veículos por ID
      const veiculosMap = new Map(veiculosList.map(v => [v.id, v]));

      // Análise de revisões pendentes
      let periodo30 = { quantidade: 0, custoEstimado: 0 };
      let periodo60 = { quantidade: 0, custoEstimado: 0 };
      let periodo90 = { quantidade: 0, custoEstimado: 0 };
      let proximaSemana = 0;
      const contagemPorDia: Record<string, number> = {};

      revisoesList.forEach(rev => {
        if (rev.status_execucao === 'realizada') return;

        const veiculo = veiculosMap.get(rev.veiculo_id);
        if (!veiculo) return;

        const status = calcularStatusRevisao(rev, veiculo.km_atual || 0, veiculo.hora_atual || 0);
        const diasEstimados = status.diasEstimados;

        if (diasEstimados === null) return;

        const dataEstimada = addDays(hoje, diasEstimados);
        const custoEstimado = getCustoEstimado(rev.tipo_revisao_id);

        // Categorizar por período
        if (diasEstimados <= 30) {
          periodo30.quantidade++;
          periodo30.custoEstimado += custoEstimado;
        }
        if (diasEstimados <= 60) {
          periodo60.quantidade++;
          periodo60.custoEstimado += custoEstimado;
        }
        if (diasEstimados <= 90) {
          periodo90.quantidade++;
          periodo90.custoEstimado += custoEstimado;
        }
        if (diasEstimados <= 7) {
          proximaSemana++;
        }

        // Contagem por dia da semana
        const diaSemana = dataEstimada.toLocaleDateString('pt-BR', { weekday: 'short' });
        contagemPorDia[diaSemana] = (contagemPorDia[diaSemana] || 0) + 1;
      });

      // Ordenar dias com mais revisões previstas
      const picosSemana = Object.entries(contagemPorDia)
        .map(([dia, quantidade]) => ({ dia, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);

      return {
        periodo30,
        periodo60,
        periodo90,
        proximaSemana,
        proximoMes: periodo30.quantidade,
        picosSemana
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useDocumentForecast() {
  return useQuery({
    queryKey: ['document_forecast'],
    queryFn: async (): Promise<DocumentForecast> => {
      const hoje = startOfDay(new Date());
      const em30dias = addDays(hoje, 30);
      const em60dias = addDays(hoje, 60);
      const em90dias = addDays(hoje, 90);

      const { data: veiculos } = await supabase
        .from('veiculos')
        .select('id, crlv_validade, tacografo_validade');

      const veiculosList = veiculos || [];
      let vencendo30 = 0;
      let vencendo60 = 0;
      let vencendo90 = 0;
      let vencidos = 0;

      veiculosList.forEach(v => {
        [v.crlv_validade, v.tacografo_validade].forEach(validade => {
          if (!validade) return;
          
          const dataValidade = new Date(validade);
          const dias = differenceInDays(dataValidade, hoje);

          if (dias < 0) {
            vencidos++;
          } else if (dias <= 30) {
            vencendo30++;
          } else if (dias <= 60) {
            vencendo60++;
          } else if (dias <= 90) {
            vencendo90++;
          }
        });
      });

      return { vencendo30, vencendo60, vencendo90, vencidos };
    },
    staleTime: 1000 * 60 * 5,
  });
}
