import { AppLayout } from '@/components/layout/AppLayout';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { UrgentRevisionsList } from '@/components/dashboard/UrgentRevisionsList';
import { StatusDistributionChart } from '@/components/dashboard/StatusDistributionChart';
import { PeriodStatsGrid } from '@/components/dashboard/PeriodStatsGrid';
import { DeliveryStatsGrid } from '@/components/dashboard/DeliveryStatsGrid';
import { DocumentosVencidosCard } from '@/components/dashboard/DocumentosVencidosCard';
import { KPIsCard } from '@/components/dashboard/KPIsCard';
import { InsightsCard } from '@/components/dashboard/InsightsCard';
import { CompanyComparisonCard } from '@/components/dashboard/CompanyComparisonCard';
import { OfficinaRankingCard } from '@/components/dashboard/OfficinaRankingCard';
import { ForecastCard } from '@/components/dashboard/ForecastCard';
import { FleetAvailabilityCard } from '@/components/dashboard/FleetAvailabilityCard';

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Insights Inteligentes + Disponibilidade */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <InsightsCard />
          </div>
          <div>
            <FleetAvailabilityCard />
          </div>
        </div>

        {/* Cards por Período com Drill-down */}
        <PeriodStatsGrid />
        
        {/* KPIs de Previsão de Entrega */}
        <DeliveryStatsGrid />

        {/* Previsão de Demanda */}
        <ForecastCard />
        
        {/* KPIs Financeiros e Documentos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KPIsCard />
          <DocumentosVencidosCard />
        </div>

        {/* Comparativo por Empresa e Ranking de Oficinas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CompanyComparisonCard />
          <OfficinaRankingCard />
        </div>
        
        {/* Resumo Geral da Frota */}
        <StatsOverview />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <UrgentRevisionsList />
          </div>
          <div>
            <StatusDistributionChart />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
