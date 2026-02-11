import { useState } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  CalendarCheck, 
  CalendarDays, 
  CalendarRange, 
  CalendarClock,
  Wrench
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PeriodCard } from './PeriodCard';
import { DrilldownModal } from './DrilldownModal';
import { usePeriodStats } from '@/hooks/usePeriodStats';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodType, RevisionDrilldownItem } from '@/types/fleet';

interface ModalState {
  open: boolean;
  periodType: PeriodType;
  items: RevisionDrilldownItem[];
}

function formatDate(date: Date): string {
  return format(date, 'dd/MM', { locale: ptBR });
}

function formatPeriod(inicio: Date, fim: Date): string {
  return `${formatDate(inicio)} - ${formatDate(fim)}`;
}

export function PeriodStatsGrid() {
  const { data: stats, isLoading } = usePeriodStats();
  const [modal, setModal] = useState<ModalState>({
    open: false,
    periodType: 'vencidas',
    items: [],
  });

  const openModal = (periodType: PeriodType, items: RevisionDrilldownItem[]) => {
    setModal({ open: true, periodType, items });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, open: false }));
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px]" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <PeriodCard
          title="Vencidas"
          count={stats.vencidas.length}
          icon={AlertTriangle}
          variant="critical"
          onClick={() => openModal('vencidas', stats.vencidas)}
        />
        <PeriodCard
          title="Em Serviço"
          count={stats.emServico.length}
          icon={Wrench}
          variant="inService"
          onClick={() => openModal('emServico', stats.emServico)}
        />
        <PeriodCard
          title="Hoje"
          subtitle={formatDate(stats.datas.hoje)}
          count={stats.hoje.length}
          icon={Calendar}
          variant="today"
          onClick={() => openModal('hoje', stats.hoje)}
        />
        <PeriodCard
          title="Amanhã"
          subtitle={formatDate(stats.datas.amanha)}
          count={stats.amanha.length}
          icon={CalendarCheck}
          variant="tomorrow"
          onClick={() => openModal('amanha', stats.amanha)}
        />
        <PeriodCard
          title="Esta Semana"
          subtitle={formatPeriod(stats.datas.essaSemana.inicio, stats.datas.essaSemana.fim)}
          count={stats.essaSemana.length}
          icon={CalendarDays}
          variant="week"
          onClick={() => openModal('essaSemana', stats.essaSemana)}
        />
        <PeriodCard
          title="Próx. Semana"
          subtitle={formatPeriod(stats.datas.proximaSemana.inicio, stats.datas.proximaSemana.fim)}
          count={stats.proximaSemana.length}
          icon={CalendarRange}
          variant="nextWeek"
          onClick={() => openModal('proximaSemana', stats.proximaSemana)}
        />
        <PeriodCard
          title="Este Mês"
          subtitle={formatPeriod(stats.datas.esseMes.inicio, stats.datas.esseMes.fim)}
          count={stats.esseMes.length}
          icon={CalendarClock}
          variant="month"
          onClick={() => openModal('esseMes', stats.esseMes)}
        />
      </div>

      <DrilldownModal
        open={modal.open}
        onOpenChange={closeModal}
        title=""
        items={modal.items}
        periodType={modal.periodType}
      />
    </>
  );
}
