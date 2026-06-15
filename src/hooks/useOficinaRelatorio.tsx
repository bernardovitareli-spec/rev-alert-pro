import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OficinaRelatorioFiltros {
  dataInicio: string; // yyyy-mm-dd
  dataFim: string;    // yyyy-mm-dd
  empresaId: string;  // 'all' or id
}

interface OrdemRow {
  id: string;
  veiculo_id: string;
  tipo_manutencao: 'preventiva' | 'corretiva';
  subcategoria_corretiva: string | null;
  tipo_revisao_id: string | null;
  data_entrada: string;
  data_saida: string | null;
  tem_avarias: boolean;
  avarias_resolvidas: boolean | null;
  status: 'aberta' | 'em_andamento' | 'concluida';
  veiculo: {
    id: string;
    placa_serie: string;
    empresa_id: string | null;
    empresa: { id: string; nome: string } | null;
  } | null;
  tipo_revisao: { id: string; nome: string } | null;
}

const SUB_LABEL: Record<string, string> = {
  mecanica: 'Mecânica',
  borracharia: 'Borracharia',
  eletrica: 'Elétrica',
  ar_condicionado: 'Ar Condicionado',
  outros: 'Outros',
};

function diffDays(a: string, b: string): number {
  const d1 = new Date(a + 'T12:00:00').getTime();
  const d2 = new Date(b + 'T12:00:00').getTime();
  return Math.max(0, Math.round((d2 - d1) / 86400000));
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function useOficinaRelatorio(filtros: OficinaRelatorioFiltros) {
  return useQuery({
    queryKey: ['oficina_relatorio', filtros],
    queryFn: async () => {
      let q = supabase
        .from('ordens_servico')
        .select(
          'id, veiculo_id, tipo_manutencao, subcategoria_corretiva, tipo_revisao_id, data_entrada, data_saida, tem_avarias, avarias_resolvidas, status, veiculo:veiculos(id, placa_serie, empresa_id, empresa:empresas(id, nome)), tipo_revisao:tipos_revisao(id, nome)'
        )
        .gte('data_entrada', filtros.dataInicio)
        .lte('data_entrada', filtros.dataFim);

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data ?? []) as unknown as OrdemRow[];
      if (filtros.empresaId !== 'all') {
        rows = rows.filter((r) => r.veiculo?.empresa_id === filtros.empresaId);
      }

      const today = new Date().toISOString().slice(0, 10);
      const totalOrdens = rows.length;

      // Periodo dias calendário
      const diasPeriodo = Math.max(1, diffDays(filtros.dataInicio, filtros.dataFim) + 1);
      const mediaPorDia = totalOrdens / diasPeriodo;

      const concluidas = rows.filter((r) => r.status === 'concluida' && r.data_saida);
      const tempos = concluidas.map((r) => diffDays(r.data_entrada, r.data_saida!));
      const tempoMedio = avg(tempos);

      const comAvaria = rows.filter((r) => r.tem_avarias);
      const percAvaria = totalOrdens ? (comAvaria.length / totalOrdens) * 100 : 0;
      const avariaResolvidas = comAvaria.filter((r) => r.avarias_resolvidas).length;
      const avariaNaoResolvidas = comAvaria.length - avariaResolvidas;

      // Distribuição por tipo
      const corretivas = rows.filter((r) => r.tipo_manutencao === 'corretiva');
      const preventivas = rows.filter((r) => r.tipo_manutencao === 'preventiva');
      const distribuicaoTipo = [
        { name: 'Corretiva', value: corretivas.length, pct: totalOrdens ? (corretivas.length / totalOrdens) * 100 : 0 },
        { name: 'Preventiva', value: preventivas.length, pct: totalOrdens ? (preventivas.length / totalOrdens) * 100 : 0 },
      ];

      // Corretivas por subcategoria
      const subKeys = ['mecanica', 'borracharia', 'eletrica', 'ar_condicionado', 'outros'];
      const corretivasPorSub = subKeys.map((key) => {
        const itens = corretivas.filter((r) => (r.subcategoria_corretiva ?? 'outros') === key);
        const concl = itens.filter((r) => r.status === 'concluida' && r.data_saida);
        const tt = concl.map((r) => diffDays(r.data_entrada, r.data_saida!));
        return {
          subcategoria: SUB_LABEL[key],
          subKey: key,
          qtd: itens.length,
          tempoMedio: avg(tt),
          tempoMediano: median(tt),
          tempoMax: tt.length ? Math.max(...tt) : 0,
        };
      }).sort((a, b) => b.qtd - a.qtd);

      // Preventivas por tipo de revisão
      const tipoMap = new Map<string, { nome: string; tempos: number[]; qtd: number }>();
      preventivas.forEach((r) => {
        const k = r.tipo_revisao?.id ?? 'sem';
        const nome = r.tipo_revisao?.nome ?? 'Sem tipo';
        if (!tipoMap.has(k)) tipoMap.set(k, { nome, tempos: [], qtd: 0 });
        const e = tipoMap.get(k)!;
        e.qtd++;
        if (r.status === 'concluida' && r.data_saida) e.tempos.push(diffDays(r.data_entrada, r.data_saida));
      });
      const preventivasPorTipo = Array.from(tipoMap.values())
        .map((e) => ({ tipo: e.nome, qtd: e.qtd, tempoMedio: avg(e.tempos), mediana: median(e.tempos) }))
        .sort((a, b) => b.qtd - a.qtd);

      // Atendimentos por empresa
      const empMap = new Map<string, any>();
      rows.forEach((r) => {
        const k = r.veiculo?.empresa?.id ?? 'sem';
        const nome = r.veiculo?.empresa?.nome ?? 'Sem empresa';
        if (!empMap.has(k)) {
          empMap.set(k, { empresa: nome, total: 0, corretivas: 0, preventivas: 0, emAberto: 0, tempos: [], avarias: 0 });
        }
        const e = empMap.get(k);
        e.total++;
        if (r.tipo_manutencao === 'corretiva') e.corretivas++;
        else e.preventivas++;
        if (r.status !== 'concluida') e.emAberto++;
        if (r.status === 'concluida' && r.data_saida) e.tempos.push(diffDays(r.data_entrada, r.data_saida));
        if (r.tem_avarias) e.avarias++;
      });
      const atendimentosPorEmpresa = Array.from(empMap.values())
        .map((e) => ({
          empresa: e.empresa,
          total: e.total,
          corretivas: e.corretivas,
          preventivas: e.preventivas,
          emAberto: e.emAberto,
          tempoMedio: avg(e.tempos),
          percAvaria: e.total ? (e.avarias / e.total) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

      // Reincidências
      const reincMap = new Map<string, any>();
      rows.forEach((r) => {
        const subOrTipo = r.tipo_manutencao === 'corretiva'
          ? (r.subcategoria_corretiva ?? 'outros')
          : (r.tipo_revisao?.id ?? 'sem');
        const k = `${r.veiculo_id}|${r.tipo_manutencao}|${subOrTipo}`;
        if (!reincMap.has(k)) {
          reincMap.set(k, {
            placa: r.veiculo?.placa_serie ?? '-',
            empresa: r.veiculo?.empresa?.nome ?? '-',
            tipoManutencao: r.tipo_manutencao,
            subcategoria: r.tipo_manutencao === 'corretiva'
              ? SUB_LABEL[r.subcategoria_corretiva ?? 'outros']
              : (r.tipo_revisao?.nome ?? 'Sem tipo'),
            entradas: [] as string[],
            temposLib: [] as number[],
          });
        }
        const e = reincMap.get(k);
        e.entradas.push(r.data_entrada);
        if (r.status === 'concluida' && r.data_saida) e.temposLib.push(diffDays(r.data_entrada, r.data_saida));
      });
      const reincidencias = Array.from(reincMap.values())
        .filter((e) => e.entradas.length >= 2)
        .map((e) => {
          const sorted = [...e.entradas].sort();
          const intervalos: number[] = [];
          for (let i = 1; i < sorted.length; i++) intervalos.push(diffDays(sorted[i - 1], sorted[i]));
          return {
            placa: e.placa,
            empresa: e.empresa,
            tipoManutencao: e.tipoManutencao,
            subcategoria: e.subcategoria,
            qtdRetornos: e.entradas.length,
            intervaloMedio: avg(intervalos),
            tempoMedioLib: avg(e.temposLib),
          };
        })
        .sort((a, b) => b.qtdRetornos - a.qtdRetornos);

      // Ordens em aberto
      const ordensAbertas = rows
        .filter((r) => r.status !== 'concluida')
        .map((r) => ({
          placa: r.veiculo?.placa_serie ?? '-',
          empresa: r.veiculo?.empresa?.nome ?? '-',
          tipo: r.tipo_manutencao,
          dataEntrada: r.data_entrada,
          diasEmOficina: diffDays(r.data_entrada, today),
        }))
        .sort((a, b) => b.diasEmOficina - a.diasEmOficina);

      return {
        kpis: {
          totalOrdens,
          mediaPorDia,
          tempoMedio,
          percAvaria,
        },
        distribuicaoTipo,
        corretivasPorSub,
        preventivasPorTipo,
        atendimentosPorEmpresa,
        reincidencias,
        ordensAbertas,
        avarias: {
          total: comAvaria.length,
          perc: percAvaria,
          resolvidas: avariaResolvidas,
          naoResolvidas: avariaNaoResolvidas,
        },
      };
    },
  });
}
