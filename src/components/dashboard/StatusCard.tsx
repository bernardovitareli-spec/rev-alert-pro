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

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg',
        statusClasses[status]
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">{title}</p>
            <p className="text-4xl font-bold mt-2">{value}</p>
            {subtitle && (
              <p className="text-sm mt-1 opacity-80">{subtitle}</p>
            )}
          </div>
          <div className="opacity-80">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
