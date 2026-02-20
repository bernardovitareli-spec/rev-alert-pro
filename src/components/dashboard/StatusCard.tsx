import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { RevisionStatus } from '@/types/fleet';

interface StatusCardProps {
  title: string;
  value: number;
  subtitle?: string;
  status: RevisionStatus;
  icon: ReactNode;
  onClick?: () => void;
}

export function StatusCard({ title, value, subtitle, status, icon, onClick }: StatusCardProps) {
  const statusClasses = {
    critical: 'status-card-critical',
    warning: 'status-card-warning',
    ok: 'status-card-ok',
  };

  const accentColors = {
    critical: 'hsl(var(--status-critical))',
    warning: 'hsl(var(--status-warning))',
    ok: 'hsl(var(--status-ok))',
  };

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-300',
        'hover:scale-[1.03] hover:-translate-y-1',
        'rounded-xl overflow-hidden',
        statusClasses[status]
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-5xl font-bold mt-2 leading-none" style={{ color: accentColors[status] }}>{value}</p>
            {subtitle && (
              <p className="text-sm mt-2 text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div 
            className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accentColors[status]}20` }}
          >
            <div style={{ color: accentColors[status] }}>
              {icon}
            </div>
          </div>
        </div>

        {/* Bottom bar indicator */}
        <div className="mt-5 pt-4 border-t border-border/30 flex items-center gap-1">
          <div className="h-1 flex-1 rounded-full bg-border/30" />
          <div className="h-1 w-6 rounded-full" style={{ background: accentColors[status] }} />
        </div>
      </CardContent>
    </Card>
  );
}
