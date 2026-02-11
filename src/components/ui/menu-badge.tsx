import { cn } from '@/lib/utils';

interface MenuBadgeProps {
  count: number;
  variant?: 'critical' | 'warning' | 'info';
  className?: string;
}

export function MenuBadge({ count, variant = 'critical', className }: MenuBadgeProps) {
  if (count === 0) return null;

  const variantClasses = {
    critical: 'bg-destructive text-destructive-foreground animate-pulse',
    warning: 'bg-status-warning text-status-warning-foreground',
    info: 'bg-primary text-primary-foreground',
  };

  return (
    <span 
      className={cn(
        'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
        variantClasses[variant],
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
