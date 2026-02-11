import { useState } from 'react';
import { 
  Clock,
  CalendarCheck,
  CalendarDays, 
  CalendarRange, 
  CalendarClock,
  AlertCircle,
  CalendarX
} from 'lucide-react';
import { PeriodCard } from './PeriodCard';
import { DrilldownModal } from './DrilldownModal';
import { useDeliveryStats } from '@/hooks/useDeliveryStats';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodType, RevisionDrilldownItem } from '@/types/fleet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ModalState {
  open: boolean;
  periodType: PeriodType;
  items: RevisionDrilldownItem[];
}

export function DeliveryStatsGrid() {
  const { data: stats, isLoading } = useDeliveryStats();
  const [modal, setModal] = useState<ModalState>({
    open: false,
    periodType: 'emServico',
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Previsão de Entrega</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px]" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Previsão de Entrega (Em Serviço)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MiniCard
              title="Atrasadas"
              count={stats.atrasadas.length}
              icon={AlertCircle}
              variant="critical"
              onClick={() => openModal('emServico', stats.atrasadas)}
            />
            <MiniCard
              title="Hoje"
              count={stats.hoje.length}
              icon={CalendarCheck}
              variant="today"
              onClick={() => openModal('emServico', stats.hoje)}
            />
            <MiniCard
              title="Amanhã"
              count={stats.amanha.length}
              icon={CalendarDays}
              variant="tomorrow"
              onClick={() => openModal('emServico', stats.amanha)}
            />
            <MiniCard
              title="Esta Semana"
              count={stats.essaSemana.length}
              icon={CalendarRange}
              variant="week"
              onClick={() => openModal('emServico', stats.essaSemana)}
            />
            <MiniCard
              title="Próx. Semana"
              count={stats.proximaSemana.length}
              icon={CalendarClock}
              variant="nextWeek"
              onClick={() => openModal('emServico', stats.proximaSemana)}
            />
            <MiniCard
              title="Sem Previsão"
              count={stats.semPrevisao.length}
              icon={CalendarX}
              variant="neutral"
              onClick={() => openModal('emServico', stats.semPrevisao)}
            />
          </div>
        </CardContent>
      </Card>

      <DrilldownModal
        open={modal.open}
        onOpenChange={closeModal}
        title="Previsão de Entrega"
        items={modal.items}
        periodType={modal.periodType}
      />
    </>
  );
}

interface MiniCardProps {
  title: string;
  count: number;
  icon: React.ElementType;
  variant: 'critical' | 'today' | 'tomorrow' | 'week' | 'nextWeek' | 'neutral';
  onClick: () => void;
}

const variantStyles = {
  critical: {
    bg: 'bg-destructive/10 hover:bg-destructive/20',
    text: 'text-destructive',
    iconBg: 'bg-destructive/20',
  },
  today: {
    bg: 'bg-orange-500/10 hover:bg-orange-500/20',
    text: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-500/20',
  },
  tomorrow: {
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/20',
  },
  week: {
    bg: 'bg-yellow-500/10 hover:bg-yellow-500/20',
    text: 'text-yellow-600 dark:text-yellow-500',
    iconBg: 'bg-yellow-500/20',
  },
  nextWeek: {
    bg: 'bg-blue-500/10 hover:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/20',
  },
  neutral: {
    bg: 'bg-muted/50 hover:bg-muted',
    text: 'text-muted-foreground',
    iconBg: 'bg-muted',
  },
};

function MiniCard({ title, count, icon: Icon, variant, onClick }: MiniCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`cursor-pointer rounded-lg p-3 transition-all ${styles.bg}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md ${styles.iconBg}`}>
          <Icon className={`h-4 w-4 ${styles.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xl font-bold ${styles.text}`}>{count}</p>
          <p className="text-[10px] text-muted-foreground truncate">{title}</p>
        </div>
      </div>
    </div>
  );
}
