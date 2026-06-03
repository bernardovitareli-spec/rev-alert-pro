import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  FleetKPIs, 
  GastoPorVeiculo, 
  GastoPorOficina, 
  GastoPorTipo, 
  FiltrosRelatorio,
  VeiculoDocumentosStatus,
} from '@/types/fleet';
import { calcularStatusDocumento } from '@/lib/documentCalculations';


export function useFleetAnalytics(filtros?: FiltrosRelatorio) {
  return useQuery({
    queryKey: ['fleet_analytics', filtros],
    queryFn: async () => {
      // Quando há filtro por empresa, usamos !inner em veiculos+empresas para
      // que o .eq('veiculo.empresa_id', ...) realmente filtre (PostgREST exige
      // inner join para filtrar em colunas de relacionamento aninhado).
      const filtraEmpresa = !!(filtros?.empresaId && filtros.empresaId !== 'all');
      const selectExpr = filtraEmpresa
        ? `*,
           veiculo:veiculos!inner(placa_serie, empresa_id, empresa:empresas!inner(nome)),
           tipo_revisao:tipos_revisao(nome),
           oficina:oficinas(nome)`
        : `*,
           veiculo:veiculos(placa_serie, empresa_id, empresa:empresas(nome)),
           tipo_revisao:tipos_revisao(nome),
           oficina:oficinas(nome)`;

      let historicoQuery = supabase.from('historico_revisoes').select(selectExpr);

      if (filtros?.dataInicio) {
        historicoQuery = historicoQuery.gte('data_realizacao', filtros.dataInicio);
      }
      if (filtros?.dataFim) {
        historicoQuery = historicoQuery.lte('data_realizacao', filtros.dataFim);
      }
      if (filtraEmpresa) {
        historicoQuery = historicoQuery.eq('veiculo.empresa_id', filtros!.empresaId);
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

export function useFleetKPIs(empresaId?: string | null) {
  return useQuery({
    queryKey: ['fleet_kpis', empresaId ?? 'all'],
    queryFn: async (): Promise<FleetKPIs> => {
      const { data, error } = await supabase.rpc('get_fleet_kpis', {
        p_empresa_id: empresaId ?? null,
      });
      if (error) throw error;
      const k = (data ?? {}) as Record<string, unknown>;
      const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0)) || 0;
      return {
        totalGasto: num(k.totalGasto),
        gastoMesAtual: num(k.gastoMesAtual),
        gastoMesAnterior: num(k.gastoMesAnterior),
        tendenciaGasto: (k.tendenciaGasto as 'up' | 'down' | 'stable') ?? 'stable',
        tempoMedioEntrega: num(k.tempoMedioEntrega),
        percentualVeiculosCriticos: num(k.percentualVeiculosCriticos),
        percentualDocumentosVencidos: num(k.percentualDocumentosVencidos),
        percentualDocumentosAtencao: num(k.percentualDocumentosAtencao),
        totalRevisoesRealizadas: num(k.totalRevisoesRealizadas),
        mediaGastoPorRevisao: num(k.mediaGastoPorRevisao),
      };
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
          art_validade,
          empresa:empresas(nome)
        `);

      if (error) throw error;

      const documentosStatus: VeiculoDocumentosStatus[] = (veiculos || []).map((v: any) => ({
        veiculoId: v.id,
        veiculoPlaca: v.placa_serie,
        empresaNome: v.empresa?.nome || null,
        crlv: calcularStatusDocumento(v.crlv_validade),
        tacografo: calcularStatusDocumento(v.tacografo_validade),
        art: calcularStatusDocumento(v.art_validade),
      }));

      // Separate vencidos and atenção
      const vencidos = documentosStatus.filter(d => 
        d.crlv.status === 'vencido' || d.tacografo.status === 'vencido' || d.art.status === 'vencido'
      );
      const atencao = documentosStatus.filter(d => 
        (d.crlv.status === 'atencao' || d.tacografo.status === 'atencao' || d.art.status === 'atencao') &&
        d.crlv.status !== 'vencido' && d.tacografo.status !== 'vencido' && d.art.status !== 'vencido'
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
