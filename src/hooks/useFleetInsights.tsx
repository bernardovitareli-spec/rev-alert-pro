import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { calcularStatusDocumento } from '@/lib/documentCalculations';

export interface FleetInsight {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  icon: 'alert' | 'trending' | 'clock' | 'truck' | 'file' | 'wrench' | 'dollar';
  title: string;
  description: string;
  value?: string | number;
  action?: {
    label: string;
    route: string;
  };
}

export interface FleetAvailability {
  total: number;
  disponivel: number;
  emServico: number;
  percentualDisponivel: number;
}

export function useFleetInsights() {
  return useQuery({
    queryKey: ['fleet_insights'],
    queryFn: async (): Promise<FleetInsight[]> => {
      const insights: FleetInsight[] = [];
      const hoje = new Date();
      const inicioMes = startOfMonth(hoje);
      const fimMes = endOfMonth(hoje);
      const inicioMesAnterior = startOfMonth(subMonths(hoje, 1));
      const fimMesAnterior = endOfMonth(subMonths(hoje, 1));

      // Buscar dados em paralelo
      const [
        { data: veiculos },
        { data: revisoes },
        { data: historicoMesAtual },
        { data: historicoMesAnterior },
        { data: oficinas },
        { data: empresas }
      ] = await Promise.all([
        supabase.from('veiculos').select('id, placa_serie, empresa_id, crlv_validade, tacografo_validade, ultima_atualizacao, retorno_patio'),
        supabase.from('revisoes').select('id, veiculo_id, status_execucao, oficina_id, previsao_entrega, valor'),
        supabase.from('historico_revisoes').select('id, veiculo_id, oficina_id, valor, data_realizacao, tempo_servico_dias')
          .gte('data_realizacao', inicioMes.toISOString().split('T')[0])
          .lte('data_realizacao', fimMes.toISOString().split('T')[0]),
        supabase.from('historico_revisoes').select('id, valor')
          .gte('data_realizacao', inicioMesAnterior.toISOString().split('T')[0])
          .lte('data_realizacao', fimMesAnterior.toISOString().split('T')[0]),
        supabase.from('oficinas').select('id, nome'),
        supabase.from('empresas').select('id, nome')
      ]);

      const veiculosList = veiculos || [];
      const revisoesList = revisoes || [];
      const historicoAtual = historicoMesAtual || [];
      const historicoAnterior = historicoMesAnterior || [];
      const oficinasList = oficinas || [];
      const empresasList = empresas || [];

      // 1. Insight: Taxa de Disponibilidade
      const emServico = revisoesList.filter(r => r.status_execucao === 'em_servico').length;
      const totalVeiculos = veiculosList.length;
      const disponiveis = totalVeiculos - emServico;
      const taxaDisponibilidade = totalVeiculos > 0 ? (disponiveis / totalVeiculos) * 100 : 100;

      if (taxaDisponibilidade < 85) {
        insights.push({
          id: 'disponibilidade-baixa',
          type: 'critical',
          icon: 'truck',
          title: 'Disponibilidade da Frota Baixa',
          description: `Apenas ${taxaDisponibilidade.toFixed(0)}% da frota está disponível. Meta: 85%`,
          value: `${disponiveis}/${totalVeiculos}`,
          action: { label: 'Ver em serviço', route: '/veiculos?statusExecucao=em_servico' }
        });
      }

      // 2. Insight: Concentração de gastos em poucos veículos
      const gastosPorVeiculo = historicoAtual.reduce((acc, h) => {
        if (!acc[h.veiculo_id]) acc[h.veiculo_id] = 0;
        acc[h.veiculo_id] += h.valor || 0;
        return acc;
      }, {} as Record<string, number>);

      const gastosOrdenados = Object.entries(gastosPorVeiculo).sort((a, b) => b[1] - a[1]);
      const gastoTotal = historicoAtual.reduce((sum, h) => sum + (h.valor || 0), 0);

      if (gastosOrdenados.length >= 3 && gastoTotal > 0) {
        const top3Gasto = gastosOrdenados.slice(0, 3).reduce((sum, [, val]) => sum + val, 0);
        const percentualTop3 = (top3Gasto / gastoTotal) * 100;

        if (percentualTop3 >= 40) {
          insights.push({
            id: 'concentracao-gastos',
            type: 'warning',
            icon: 'dollar',
            title: 'Concentração de Gastos',
            description: `3 veículos representam ${percentualTop3.toFixed(0)}% dos gastos do mês`,
            value: `R$ ${top3Gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            action: { label: 'Ver relatório', route: '/relatorios' }
          });
        }
      }

      // 3. Insight: Oficina com tempo acima da média
      const temposPorOficina = historicoAtual.reduce((acc, h) => {
        if (h.oficina_id && h.tempo_servico_dias) {
          if (!acc[h.oficina_id]) acc[h.oficina_id] = [];
          acc[h.oficina_id].push(h.tempo_servico_dias);
        }
        return acc;
      }, {} as Record<string, number[]>);

      const tempoMedioGeral = historicoAtual
        .filter(h => h.tempo_servico_dias)
        .reduce((sum, h, _, arr) => sum + (h.tempo_servico_dias || 0) / arr.length, 0);

      Object.entries(temposPorOficina).forEach(([oficinaId, tempos]) => {
        const mediaOficina = tempos.reduce((a, b) => a + b, 0) / tempos.length;
        const diferenca = mediaOficina - tempoMedioGeral;

        if (diferenca >= 3 && tempos.length >= 2) {
          const oficina = oficinasList.find(o => o.id === oficinaId);
          if (oficina) {
            insights.push({
              id: `oficina-lenta-${oficinaId}`,
              type: 'warning',
              icon: 'clock',
              title: `Oficina ${oficina.nome} Lenta`,
              description: `Tempo médio ${diferenca.toFixed(0)} dias acima da média geral`,
              value: `${mediaOficina.toFixed(1)} dias`,
              action: { label: 'Ver oficinas', route: '/oficinas' }
            });
          }
        }
      });

      // 4. Insight: Documentos vencidos por empresa
      empresasList.forEach(empresa => {
        const veiculosEmpresa = veiculosList.filter(v => v.empresa_id === empresa.id);
        if (veiculosEmpresa.length === 0) return;

        let docsVencidos = 0;
        veiculosEmpresa.forEach(v => {
          const crlv = calcularStatusDocumento(v.crlv_validade);
          const taco = calcularStatusDocumento(v.tacografo_validade);
          if (crlv.status === 'vencido') docsVencidos++;
          if (taco.status === 'vencido') docsVencidos++;
        });

        const totalDocs = veiculosEmpresa.length * 2;
        const percentualVencido = (docsVencidos / totalDocs) * 100;

        if (percentualVencido >= 50) {
          insights.push({
            id: `docs-empresa-${empresa.id}`,
            type: 'critical',
            icon: 'file',
            title: `${empresa.nome}: Documentos Críticos`,
            description: `${percentualVencido.toFixed(0)}% dos documentos estão vencidos`,
            value: `${docsVencidos} vencidos`,
            action: { label: 'Ver veículos', route: `/veiculos?empresa=${empresa.id}` }
          });
        }
      });

      // 5. Insight: Entregas atrasadas
      const atrasadas = revisoesList.filter(r => {
        if (r.status_execucao !== 'em_servico' || !r.previsao_entrega) return false;
        return parseISO(r.previsao_entrega) < hoje;
      });

      if (atrasadas.length > 0) {
        insights.push({
          id: 'entregas-atrasadas',
          type: 'critical',
          icon: 'alert',
          title: 'Entregas Atrasadas',
          description: `${atrasadas.length} revisões passaram da previsão de entrega`,
          value: atrasadas.length,
          action: { label: 'Ver atrasadas', route: '/veiculos?insight=entregas_atrasadas' }
        });
      }

      // 6. Insight: Veículos com KM/Hora desatualizado
      const diasLimite = 30;
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - diasLimite);

      const veiculosDesatualizados = veiculosList.filter(v => {
        if (!v.ultima_atualizacao) return true;
        return parseISO(v.ultima_atualizacao) < dataLimite;
      });

      if (veiculosDesatualizados.length >= 5) {
        const percentual = (veiculosDesatualizados.length / totalVeiculos) * 100;
        insights.push({
          id: 'km-desatualizado',
          type: percentual >= 30 ? 'critical' : 'warning',
          icon: 'clock',
          title: 'KM/Hora Desatualizado',
          description: `${veiculosDesatualizados.length} veículos sem atualização há mais de ${diasLimite} dias`,
          value: `${percentual.toFixed(0)}% da frota`,
          action: { label: 'Atualizar veículos', route: '/veiculos?insight=km_desatualizado' }
        });
      }

      // 7. Insight: Veículos com retorno ao pátio atrasado
      const veiculosRetornoAtrasado = veiculosList.filter(v => {
        if (!v.retorno_patio) return false;
        return parseISO(v.retorno_patio) < hoje;
      });

      if (veiculosRetornoAtrasado.length >= 3) {
        insights.push({
          id: 'retorno-atrasado',
          type: veiculosRetornoAtrasado.length >= 10 ? 'critical' : 'warning',
          icon: 'truck',
          title: 'Retorno ao Pátio Atrasado',
          description: `${veiculosRetornoAtrasado.length} veículos deveriam ter retornado e não voltaram`,
          value: `${veiculosRetornoAtrasado.length} veículos`,
          action: { label: 'Ver veículos', route: '/veiculos?insight=retorno_atrasado' }
        });
      }

      // 6. Insight: Tendência de gastos
      const gastoMesAtual = historicoAtual.reduce((sum, h) => sum + (h.valor || 0), 0);
      const gastoMesAnterior = historicoAnterior.reduce((sum, h) => sum + (h.valor || 0), 0);

      if (gastoMesAnterior > 0) {
        const variacao = ((gastoMesAtual - gastoMesAnterior) / gastoMesAnterior) * 100;

        if (variacao >= 30) {
          insights.push({
            id: 'aumento-gastos',
            type: 'warning',
            icon: 'trending',
            title: 'Aumento Significativo de Gastos',
            description: `Gastos ${variacao.toFixed(0)}% maiores que o mês anterior`,
            value: `+R$ ${(gastoMesAtual - gastoMesAnterior).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            action: { label: 'Ver relatório', route: '/relatorios' }
          });
        } else if (variacao <= -20) {
          insights.push({
            id: 'reducao-gastos',
            type: 'success',
            icon: 'trending',
            title: 'Redução de Gastos',
            description: `Gastos ${Math.abs(variacao).toFixed(0)}% menores que o mês anterior`,
            value: `-R$ ${Math.abs(gastoMesAtual - gastoMesAnterior).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          });
        }
      }

      // 9. Insight: Documentos em dia (positivo)
      let totalDocs = 0;
      let docsEmDia = 0;
      veiculosList.forEach(v => {
        const crlv = calcularStatusDocumento(v.crlv_validade);
        const taco = calcularStatusDocumento(v.tacografo_validade);
        if (v.crlv_validade) {
          totalDocs++;
          if (crlv.status !== 'vencido') docsEmDia++;
        }
        if (v.tacografo_validade) {
          totalDocs++;
          if (taco.status !== 'vencido') docsEmDia++;
        }
      });

      if (totalDocs > 0) {
        const percentualEmDia = (docsEmDia / totalDocs) * 100;
        if (percentualEmDia >= 80) {
          insights.push({
            id: 'docs-em-dia',
            type: 'success',
            icon: 'file',
            title: 'Documentação em Dia',
            description: `${percentualEmDia.toFixed(0)}% dos documentos da frota estão válidos`,
            value: `${docsEmDia}/${totalDocs} docs`,
          });
        }
      }

      // 10. Insight: Sem insights = tudo bem!
      if (insights.length === 0) {
        insights.push({
          id: 'tudo-ok',
          type: 'success',
          icon: 'truck',
          title: 'Frota em Bom Estado',
          description: 'Nenhum alerta crítico detectado. Continue monitorando!',
        });
      }

      // Ordenar por prioridade
      const prioridade = { critical: 0, warning: 1, info: 2, success: 3 };
      return insights.sort((a, b) => prioridade[a.type] - prioridade[b.type]);
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useFleetAvailability() {
  return useQuery({
    queryKey: ['fleet_availability'],
    queryFn: async (): Promise<FleetAvailability> => {
      const [{ data: veiculos }, { data: revisoes }] = await Promise.all([
        supabase.from('veiculos').select('id'),
        supabase.from('revisoes').select('id, status_execucao').eq('status_execucao', 'em_servico')
      ]);

      const total = veiculos?.length || 0;
      const emServico = revisoes?.length || 0;
      const disponivel = total - emServico;

      return {
        total,
        disponivel,
        emServico,
        percentualDisponivel: total > 0 ? (disponivel / total) * 100 : 100
      };
    },
    staleTime: 1000 * 60 * 2,
  });
}
