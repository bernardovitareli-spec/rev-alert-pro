import { useMemo } from 'react';
import { useVeiculosComRevisoes } from './useFleetData';
import { RevisionDrilldownItem } from '@/types/fleet';
import { parseISO, isToday, isTomorrow, isThisMonth, isBefore, startOfDay, endOfWeek, startOfWeek, addWeeks } from 'date-fns';

export interface DeliveryStats {
  atrasadas: RevisionDrilldownItem[];
  hoje: RevisionDrilldownItem[];
  amanha: RevisionDrilldownItem[];
  essaSemana: RevisionDrilldownItem[];
  proximaSemana: RevisionDrilldownItem[];
  esseMes: RevisionDrilldownItem[];
  semPrevisao: RevisionDrilldownItem[];
}

export function useDeliveryStats() {
  const { data: veiculosComRevisoes, isLoading, error } = useVeiculosComRevisoes();

  const deliveryStats = useMemo<DeliveryStats | null>(() => {
    if (!veiculosComRevisoes) return null;

    const hoje = startOfDay(new Date());
    
    // Get revisions that are "em_servico"
    const emServicoRevisions: RevisionDrilldownItem[] = veiculosComRevisoes.flatMap(v =>
      v.revisoes
        .filter(r => r.status_execucao === 'em_servico')
        .map(r => ({
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

    // Calculate week boundaries (Sunday to Saturday)
    const fimEssaSemana = endOfWeek(hoje, { weekStartsOn: 0 });
    const inicioProximaSemana = startOfWeek(addWeeks(hoje, 1), { weekStartsOn: 0 });
    const fimProximaSemana = endOfWeek(addWeeks(hoje, 1), { weekStartsOn: 0 });

    const sortByDate = (items: RevisionDrilldownItem[]) =>
      [...items].sort((a, b) => {
        if (!a.previsaoEntrega && !b.previsaoEntrega) return 0;
        if (!a.previsaoEntrega) return 1;
        if (!b.previsaoEntrega) return -1;
        return parseISO(a.previsaoEntrega).getTime() - parseISO(b.previsaoEntrega).getTime();
      });

    // Sem previsão
    const semPrevisao = emServicoRevisions.filter(r => !r.previsaoEntrega);

    // Com previsão
    const comPrevisao = emServicoRevisions.filter(r => r.previsaoEntrega);

    // Atrasadas: previsão antes de hoje
    const atrasadas = sortByDate(
      comPrevisao.filter(r => {
        const data = parseISO(r.previsaoEntrega!);
        return isBefore(data, hoje);
      })
    );

    // Hoje
    const hojeItems = sortByDate(
      comPrevisao.filter(r => isToday(parseISO(r.previsaoEntrega!)))
    );

    // Amanhã
    const amanhaItems = sortByDate(
      comPrevisao.filter(r => isTomorrow(parseISO(r.previsaoEntrega!)))
    );

    // Esta Semana (até sábado)
    const essaSemanaItems = sortByDate(
      comPrevisao.filter(r => {
        const data = parseISO(r.previsaoEntrega!);
        return data >= hoje && data <= fimEssaSemana;
      })
    );

    // Próxima Semana
    const proximaSemanaItems = sortByDate(
      comPrevisao.filter(r => {
        const data = parseISO(r.previsaoEntrega!);
        return data >= inicioProximaSemana && data <= fimProximaSemana;
      })
    );

    // Este Mês
    const esseMesItems = sortByDate(
      comPrevisao.filter(r => {
        const data = parseISO(r.previsaoEntrega!);
        return isThisMonth(data) && data >= hoje;
      })
    );

    return {
      atrasadas,
      hoje: hojeItems,
      amanha: amanhaItems,
      essaSemana: essaSemanaItems,
      proximaSemana: proximaSemanaItems,
      esseMes: esseMesItems,
      semPrevisao,
    };
  }, [veiculosComRevisoes]);

  return { data: deliveryStats, isLoading, error };
}

// Helper function to get relative period label for a date
export function getPrevisaoLabel(dateString: string | null): string {
  if (!dateString) return 'Sem previsão';
  
  const date = parseISO(dateString);
  const hoje = startOfDay(new Date());
  
  if (isBefore(date, hoje)) return 'Atrasada';
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  
  // Check this week (until Saturday)
  const fimEssaSemana = endOfWeek(hoje, { weekStartsOn: 0 });
  if (date <= fimEssaSemana) return 'Esta Semana';
  
  // Check next week
  const inicioProximaSemana = startOfWeek(addWeeks(hoje, 1), { weekStartsOn: 0 });
  const fimProximaSemana = endOfWeek(addWeeks(hoje, 1), { weekStartsOn: 0 });
  if (date >= inicioProximaSemana && date <= fimProximaSemana) return 'Próx. Semana';
  
  // Check this month
  if (isThisMonth(date)) return 'Este Mês';
  
  return 'Futuro';
}

export function getPrevisaoColor(dateString: string | null): string {
  if (!dateString) return 'text-muted-foreground';
  
  const date = parseISO(dateString);
  const hoje = startOfDay(new Date());
  
  if (isBefore(date, hoje)) return 'text-destructive';
  if (isToday(date)) return 'text-orange-600';
  if (isTomorrow(date)) return 'text-amber-600';
  
  return 'text-muted-foreground';
}
