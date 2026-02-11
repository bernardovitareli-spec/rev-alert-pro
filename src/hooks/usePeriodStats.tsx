import { useMemo } from 'react';
import { useVeiculosComRevisoes } from './useFleetData';
import { RevisionPeriodStats, RevisionDrilldownItem, PeriodDates } from '@/types/fleet';
import { endOfMonth } from 'date-fns';

// Calcular quantos dias até o próximo Sábado (0 = Domingo, 6 = Sábado)
function getDiasAteSabado(hoje: Date): number {
  const diaSemana = hoje.getDay(); // 0 = Domingo, 6 = Sábado
  
  if (diaSemana === 6) return 0; // Já é Sábado
  return 6 - diaSemana; // Dias restantes até Sábado
}

// Calcular datas de início e fim de cada período
function getPeriodDates(): { diasAteSabado: number; diasAteProximoSabado: number; datas: PeriodDates } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const diasAteSabado = getDiasAteSabado(hoje);
  
  // Amanhã
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  
  // Esta Semana: hoje até Sábado
  const fimEssaSemana = new Date(hoje);
  fimEssaSemana.setDate(hoje.getDate() + diasAteSabado);
  
  // Próxima Semana: Domingo até Sábado seguinte
  const inicioProximaSemana = new Date(fimEssaSemana);
  inicioProximaSemana.setDate(fimEssaSemana.getDate() + 1); // Domingo
  
  const fimProximaSemana = new Date(inicioProximaSemana);
  fimProximaSemana.setDate(inicioProximaSemana.getDate() + 6); // Sábado
  
  // Este Mês: hoje até fim do mês
  const fimMes = endOfMonth(hoje);
  
  return {
    diasAteSabado,
    diasAteProximoSabado: diasAteSabado + 7,
    datas: {
      hoje,
      amanha,
      essaSemana: { inicio: hoje, fim: fimEssaSemana },
      proximaSemana: { inicio: inicioProximaSemana, fim: fimProximaSemana },
      esseMes: { inicio: hoje, fim: fimMes },
    }
  };
}

export function usePeriodStats() {
  const { data: veiculosComRevisoes, isLoading, error } = useVeiculosComRevisoes();

  const periodStats = useMemo<RevisionPeriodStats | null>(() => {
    if (!veiculosComRevisoes) return null;

    const { diasAteSabado, diasAteProximoSabado, datas } = getPeriodDates();

    // Flatten all revisions with vehicle info
    const allRevisions: RevisionDrilldownItem[] = veiculosComRevisoes.flatMap(v =>
      v.revisoes.map(r => ({
        revisaoId: r.id,
        veiculoId: v.id,
        veiculoPlaca: v.placa_serie,
        veiculoTag: v.tag_obra,
        empresaNome: v.empresa?.nome ?? null,
        tipoRevisaoNome: r.tipo_revisao?.nome || 'Revisão',
        status: r.status,
        statusExecucao: r.status_execucao,
        previsaoEntrega: r.previsao_entrega,
        oficinaId: r.oficina_id,
        valor: r.valor ?? null,
        diasEstimados: r.diasEstimados,
        faltam: r.faltam,
        unidade: r.unidade,
        kmAtual: v.km_atual ?? 0,
        horaAtual: v.hora_atual ?? 0,
      }))
    );

    // Sort by urgency (most urgent first)
    const sortByUrgency = (items: RevisionDrilldownItem[]) => 
      [...items].sort((a, b) => {
        if (a.diasEstimados === null && b.diasEstimados === null) return 0;
        if (a.diasEstimados === null) return 1;
        if (b.diasEstimados === null) return -1;
        return a.diasEstimados - b.diasEstimados;
      });

    // Vencidas: status critical (diasEstimados <= 0)
    const vencidas = sortByUrgency(
      allRevisions.filter(r => r.status === 'critical')
    );

    // Hoje: diasEstimados === 0 mas não vencido (pode haver sobreposição)
    const hoje = sortByUrgency(
      allRevisions.filter(r => r.diasEstimados !== null && r.diasEstimados === 0 && r.status !== 'critical')
    );

    // Amanhã: diasEstimados === 1
    const amanha = sortByUrgency(
      allRevisions.filter(r => r.diasEstimados === 1)
    );

    // Essa Semana: de hoje até Sábado (baseado em dias reais até Sábado)
    const essaSemana = sortByUrgency(
      allRevisions.filter(r => r.diasEstimados !== null && r.diasEstimados >= 0 && r.diasEstimados <= diasAteSabado)
    );

    // Próxima Semana: de Domingo até Sábado seguinte
    const proximaSemana = sortByUrgency(
      allRevisions.filter(r => r.diasEstimados !== null && r.diasEstimados > diasAteSabado && r.diasEstimados <= diasAteProximoSabado)
    );

    // Esse Mês: de hoje até fim do mês
    const diasAteFimMes = Math.ceil((datas.esseMes.fim.getTime() - datas.esseMes.inicio.getTime()) / (1000 * 60 * 60 * 24));
    const esseMes = sortByUrgency(
      allRevisions.filter(r => r.diasEstimados !== null && r.diasEstimados >= 0 && r.diasEstimados <= diasAteFimMes)
    );

    // Em Serviço: revisões com status_execucao = 'em_servico'
    const emServico = sortByUrgency(
      allRevisions.filter(r => r.statusExecucao === 'em_servico')
    );

    return {
      vencidas,
      hoje,
      amanha,
      essaSemana,
      proximaSemana,
      esseMes,
      emServico,
      datas,
    };
  }, [veiculosComRevisoes]);

  return { data: periodStats, isLoading, error };
}
