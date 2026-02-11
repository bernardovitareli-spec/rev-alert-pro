import { forwardRef } from 'react';
import { ExecutionStatus } from '@/types/fleet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Wrench, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusExecucaoSelectProps {
  value: ExecutionStatus;
  onChange: (status: ExecutionStatus) => void;
  disabled?: boolean;
  isVencida?: boolean;
}

const statusConfig: Record<ExecutionStatus, { label: string; icon: React.ElementType; className: string }> = {
  nao_realizada: {
    label: 'Não Realizada',
    icon: X,
    className: 'text-destructive bg-destructive/10 border-destructive/20',
  },
  em_servico: {
    label: 'Em Serviço',
    icon: Wrench,
    className: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  },
  realizada: {
    label: 'Realizada',
    icon: Check,
    className: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
  },
};

export const StatusExecucaoSelect = forwardRef<HTMLButtonElement, StatusExecucaoSelectProps>(
  ({ value, onChange, disabled = false, isVencida = false }, ref) => {
    const config = statusConfig[value];
    const Icon = config.icon;

    return (
      <Select 
        value={value} 
        onValueChange={(v) => onChange(v as ExecutionStatus)}
        disabled={disabled}
      >
        <SelectTrigger 
          ref={ref}
          className={cn(
            "w-[150px] h-8 text-xs border",
            config.className,
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <SelectValue>
            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              <span>{config.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="nao_realizada">
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-destructive" />
              <span>Não Realizada</span>
            </div>
          </SelectItem>
          <SelectItem value="em_servico">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-600" />
              <span>Em Serviço</span>
            </div>
          </SelectItem>
          {!isVencida && (
            <SelectItem value="realizada">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Realizada</span>
              </div>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    );
  }
);

StatusExecucaoSelect.displayName = 'StatusExecucaoSelect';

export function StatusExecucaoBadge({ status }: { status: ExecutionStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("text-xs gap-1", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function getStatusExecucaoLabel(status: ExecutionStatus): string {
  return statusConfig[status].label;
}

export function getStatusExecucaoColor(status: ExecutionStatus): string {
  return statusConfig[status].className;
}
