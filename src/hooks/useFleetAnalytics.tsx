import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  FleetKPIs, 
  GastoPorVeiculo, 
  GastoPorOficina, 
  GastoPorTipo, 
  FiltrosRelatorio,
  VeiculoDocumentosStatus
} from '@/types/fleet';
import { calcularStatusDocumento } from '@/lib/documentCalculations';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export function useFleetAnalytics(filtros?: FiltrosRelatorio) {
  return useQuery({
    queryKey: ['fleet_analytics', filtros],
    queryFn: async () => {
      // Fetch historico
      let historicoQuery = supabase
        .from('historico_revisoes')
        .select(`
          *,
          veiculo:veiculos(placa_serie, empresa:empresas(nome)),
          tipo_revisao:tipos_revisao(nome),
          oficina:oficinas(nome)
        `);

      if (filtros?.dataInicio) {
        historicoQuery = historicoQuery.gte('data_realizacao', filtros.dataInicio);
      }
      if (filtros?.dataFim) {
        historicoQuery = historicoQuery.lte('data_realizacao', filtros.dataFim);
      }
      if (filtros?.empresaId && filtros.empresaId !== 'all') {
        historicoQuery = historicoQuery.eq('veiculo.empresa_id', filtros.empresaId);
      }
      if (filtros?.oficinaId && filtros.oficinaId !== 'all') {
        historicoQuery = historicoQuery.eq('oficina_id', filtros.oficinaId);
      }
      if (filtros?.tipoRevisaoId && filtros.tipoRevisaoId !== 'all') {
        historicoQuery = historicoQuery.eq('tipo_revisao_id', filtros.tipoRevisaoId);
      }

      const { data: historico, error } = await historicoQuery;
      if (error) throw error;

      // Calculate gastos por veículo
      const gastosPorVeiculo: Record<string, GastoPorVeiculo> = {};
      const gastosPorOficina: Record<string, GastoPorOficina> = {};
      const gastosPorTipo: Record<string, GastoPorTipo> = {};

      let totalGasto = 0;

      historico?.forEach((h: any) => {
        const valor = h.valor || 0;
        totalGasto += valor;

        // Por veículo
        if (!gastosPorVeiculo[h.veiculo_id]) {
          gastosPorVeiculo[h.veiculo_id] = {
            veiculoId: h.veiculo_id,
            veiculoPlaca: h.veiculo?.placa_serie || 'Desconhecido',
            empresaNome: h.veiculo?.empresa?.nome || null,
            totalGasto: 0,
            qtdRevisoes: 0,
          };
        }
        gastosPorVeiculo[h.veiculo_id].totalGasto += valor;
        gastosPorVeiculo[h.veiculo_id].qtdRevisoes += 1;

        // Por oficina
        if (h.oficina_id) {
          if (!gastosPorOficina[h.oficina_id]) {
            gastosPorOficina[h.oficina_id] = {
              oficinaId: h.oficina_id,
              oficinaNome: h.oficina?.nome || 'Desconhecida',
              totalGasto: 0,
              qtdServicos: 0,
              tempoMedioDias: 0,
            };
          }
          gastosPorOficina[h.oficina_id].totalGasto += valor;
          gastosPorOficina[h.oficina_id].qtdServicos += 1;
        }

        // Por tipo
        if (!gastosPorTipo[h.tipo_revisao_id]) {
          gastosPorTipo[h.tipo_revisao_id] = {
            tipoId: h.tipo_revisao_id,
            tipoNome: h.tipo_revisao?.nome || 'Desconhecido',
            totalGasto: 0,
            qtdRevisoes: 0,
          };
        }
        gastosPorTipo[h.tipo_revisao_id].totalGasto += valor;
        gastosPorTipo[h.tipo_revisao_id].qtdRevisoes += 1;
      });

      // Calculate tempo médio por oficina
      for (const oficinaId in gastosPorOficina) {
        const oficina = gastosPorOficina[oficinaId];
        const oficinasHistorico = historico?.filter((h: any) => h.oficina_id === oficinaId) || [];
        const tempos = oficinasHistorico
          .map((h: any) => h.tempo_servico_dias)
          .filter((t: any) => t !== null && t !== undefined);
        
        if (tempos.length > 0) {
          oficina.tempoMedioDias = tempos.reduce((a: number, b: number) => a + b, 0) / tempos.length;
        }
      }

      return {
        historico: historico || [],
        gastosPorVeiculo: Object.values(gastosPorVeiculo).sort((a, b) => b.totalGasto - a.totalGasto),
        gastosPorOficina: Object.values(gastosPorOficina).sort((a, b) => b.totalGasto - a.totalGasto),
        gastosPorTipo: Object.values(gastosPorTipo).sort((a, b) => b.totalGasto - a.totalGasto),
        totalGasto,
        qtdRevisoes: historico?.length || 0,
        mediaGastoPorRevisao: historico?.length ? totalGasto / historico.length : 0,
      };
    },
  });
}

export function useFleetKPIs() {
  return useQuery({
    queryKey: ['fleet_kpis'],
    queryFn: async () => {
      const hoje = new Date();
      const inicioMesAtual = startOfMonth(hoje);
      const fimMesAtual = endOfMonth(hoje);
      const inicioMesAnterior = startOfMonth(subMonths(hoje, 1));
      const fimMesAnterior = endOfMonth(subMonths(hoje, 1));

      // Fetch histórico
      const { data: historicoTotal, error: histError } = await supabase
        .from('historico_revisoes')
        .select('valor, tempo_servico_dias, data_realizacao');
      
      if (histError) throw histError;

      // Fetch veículos para documentos e status
      const { data: veiculos, error: veicError } = await supabase
        .from('veiculos')
        .select('id, crlv_validade, tacografo_validade');
      
      if (veicError) throw veicError;

      // Fetch revisões para status crítico
      const { data: revisoes, error: revError } = await supabase
        .from('revisoes')
        .select('*');
      
      if (revError) throw revError;

      // Calculate gastos por mês
      const gastoMesAtual = historicoTotal
        ?.filter(h => {
          const data = new Date(h.data_realizacao);
          return data >= inicioMesAtual && data <= fimMesAtual;
        })
        .reduce((sum, h) => sum + (h.valor || 0), 0) || 0;

      const gastoMesAnterior = historicoTotal
        ?.filter(h => {
          const data = new Date(h.data_realizacao);
          return data >= inicioMesAnterior && data <= fimMesAnterior;
        })
        .reduce((sum, h) => sum + (h.valor || 0), 0) || 0;

      // Tendência
      let tendenciaGasto: 'up' | 'down' | 'stable' = 'stable';
      if (gastoMesAnterior > 0) {
        const diff = ((gastoMesAtual - gastoMesAnterior) / gastoMesAnterior) * 100;
        if (diff > 5) tendenciaGasto = 'up';
        else if (diff < -5) tendenciaGasto = 'down';
      }

      // Tempo médio de entrega
      const tempos = historicoTotal
        ?.map(h => h.tempo_servico_dias)
        .filter(t => t !== null && t !== undefined) || [];
      const tempoMedioEntrega = tempos.length > 0 
        ? tempos.reduce((a, b) => (a || 0) + (b || 0), 0) / tempos.length 
        : 0;

      // Documentos vencidos/atenção
      let docsVencidos = 0;
      let docsAtencao = 0;
      let totalDocs = 0;

      veiculos?.forEach(v => {
        if (v.crlv_validade) {
          totalDocs++;
          const status = calcularStatusDocumento(v.crlv_validade);
          if (status.status === 'vencido') docsVencidos++;
          if (status.status === 'atencao') docsAtencao++;
        }
        if (v.tacografo_validade) {
          totalDocs++;
          const status = calcularStatusDocumento(v.tacografo_validade);
          if (status.status === 'vencido') docsVencidos++;
          if (status.status === 'atencao') docsAtencao++;
        }
      });

      const totalGasto = historicoTotal?.reduce((sum, h) => sum + (h.valor || 0), 0) || 0;
      const totalRevisoesRealizadas = historicoTotal?.length || 0;

      const kpis: FleetKPIs = {
        totalGasto,
        gastoMesAtual,
        gastoMesAnterior,
        tendenciaGasto,
        tempoMedioEntrega: Number(tempoMedioEntrega.toFixed(1)),
        percentualVeiculosCriticos: 0, // Will be calculated with revision data
        percentualDocumentosVencidos: totalDocs > 0 ? (docsVencidos / totalDocs) * 100 : 0,
        percentualDocumentosAtencao: totalDocs > 0 ? (docsAtencao / totalDocs) * 100 : 0,
        totalRevisoesRealizadas,
        mediaGastoPorRevisao: totalRevisoesRealizadas > 0 ? totalGasto / totalRevisoesRealizadas : 0,
      };

      return kpis;
    },
  });
}

export function useDocumentosVencidos() {
  return useQuery({
    queryKey: ['documentos_vencidos'],
    queryFn: async () => {
      const { data: veiculos, error } = await supabase
        .from('veiculos')
        .select(`
          id,
          placa_serie,
          crlv_validade,
          tacografo_validade,
          empresa:empresas(nome)
        `);

      if (error) throw error;

      const documentosStatus: VeiculoDocumentosStatus[] = (veiculos || []).map((v: any) => ({
        veiculoId: v.id,
        veiculoPlaca: v.placa_serie,
        empresaNome: v.empresa?.nome || null,
        crlv: calcularStatusDocumento(v.crlv_validade),
        tacografo: calcularStatusDocumento(v.tacografo_validade),
      }));

      // Separate vencidos and atenção
      const vencidos = documentosStatus.filter(d => 
        d.crlv.status === 'vencido' || d.tacografo.status === 'vencido'
      );
      const atencao = documentosStatus.filter(d => 
        (d.crlv.status === 'atencao' || d.tacografo.status === 'atencao') &&
        d.crlv.status !== 'vencido' && d.tacografo.status !== 'vencido'
      );

      return {
        todos: documentosStatus,
        vencidos,
        atencao,
        totalVencidos: vencidos.length,
        totalAtencao: atencao.length,
      };
    },
  });
}
