import { useMemo } from 'react';
import { useDashboardStats } from './useFleetData';
import { usePeriodStats } from './usePeriodStats';

export interface SidebarStats {
  veiculosCriticos: number;
  revisoesCriticas: number;
  revisoesHoje: number;
  revisoesSemana: number;
  isLoading: boolean;
}

export function useSidebarStats(): SidebarStats {
  const { data: dashboardStats, isLoading: loadingDashboard } = useDashboardStats();
  const { data: periodStats, isLoading: loadingPeriod } = usePeriodStats();

  return useMemo(() => ({
    veiculosCriticos: dashboardStats?.veiculosCriticos ?? 0,
    revisoesCriticas: dashboardStats?.revisoesCriticas ?? 0,
    revisoesHoje: periodStats?.hoje?.length ?? 0,
    revisoesSemana: periodStats?.essaSemana?.length ?? 0,
    isLoading: loadingDashboard || loadingPeriod,
  }), [dashboardStats, periodStats, loadingDashboard, loadingPeriod]);
}
