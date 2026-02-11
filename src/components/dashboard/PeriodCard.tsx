import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PeriodCardProps {
  title: string;
  subtitle?: string;
  count: number;
  icon: LucideIcon;
  variant: 'critical' | 'today' | 'tomorrow' | 'week' | 'nextWeek' | 'month' | 'inService';
  onClick: () => void;
}

const variantStyles = {
  critical: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100/80 hover:from-red-100 hover:to-red-200/80',
    text: 'text-red-600',
    iconBg: 'bg-red-500 shadow-lg shadow-red-200',
    tooltip: 'Revisões já vencidas - ação urgente necessária',
  },
  today: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100/80 hover:from-orange-100 hover:to-orange-200/80',
    text: 'text-orange-600',
    iconBg: 'bg-orange-500 shadow-lg shadow-orange-200',
    tooltip: 'Revisões previstas para hoje',
  },
  tomorrow: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/80 hover:from-amber-100 hover:to-amber-200/80',
    text: 'text-amber-600',
    iconBg: 'bg-amber-500 shadow-lg shadow-amber-200',
    tooltip: 'Revisões previstas para amanhã',
  },
  week: {
    bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/80 hover:from-yellow-100 hover:to-yellow-200/80',
    text: 'text-yellow-600',
    iconBg: 'bg-yellow-500 shadow-lg shadow-yellow-200',
    tooltip: 'Revisões previstas para esta semana',
  },
  nextWeek: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/80 hover:from-blue-100 hover:to-blue-200/80',
    text: 'text-blue-600',
    iconBg: 'bg-blue-500 shadow-lg shadow-blue-200',
    tooltip: 'Revisões previstas para próxima semana',
  },
  month: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/80 hover:from-emerald-100 hover:to-emerald-200/80',
    text: 'text-emerald-600',
    iconBg: 'bg-emerald-500 shadow-lg shadow-emerald-200',
    tooltip: 'Revisões previstas para este mês',
  },
  inService: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100/80 hover:from-purple-100 hover:to-purple-200/80',
    text: 'text-purple-600',
    iconBg: 'bg-purple-500 shadow-lg shadow-purple-200',
    tooltip: 'Veículos atualmente em manutenção na oficina',
  },
};

export function PeriodCard({ title, subtitle, count, icon: Icon, variant, onClick }: PeriodCardProps) {
  const styles = variantStyles[variant];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card 
          className={cn(
            'cursor-pointer transition-all duration-300 ease-out border-0 shadow-sm',
            'hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]',
            'active:scale-[0.98]',
            styles.bg
          )}
          onClick={onClick}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl text-white', styles.iconBg)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-2xl font-bold tracking-tight', styles.text)}>
                  {count}
                </p>
                <p className="text-xs font-medium text-muted-foreground truncate">
                  {title}
                </p>
                {subtitle && (
                  <p className="text-[10px] text-muted-foreground/70">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="font-medium">
        {styles.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
