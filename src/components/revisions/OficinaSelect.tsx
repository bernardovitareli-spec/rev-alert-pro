import { forwardRef } from 'react';
import { useOficinas } from '@/hooks/useOficinas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wrench } from 'lucide-react';

interface OficinaSelectProps {
  value: string | null;
  onChange: (oficinaId: string | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const OficinaSelect = forwardRef<HTMLButtonElement, OficinaSelectProps>(
  ({ value, onChange, disabled = false, compact = false }, ref) => {
    const { data: oficinas, isLoading } = useOficinas();

    return (
      <Select 
        value={value || 'none'} 
        onValueChange={(v) => onChange(v === 'none' ? null : v)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger 
          ref={ref}
          className={compact ? "w-[140px] h-8 text-xs" : "w-full"}
        >
          <SelectValue placeholder="Selecionar mecânico">
            {value ? (
              <div className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                <span className="truncate">
                  {oficinas?.find(o => o.id === value)?.nome || 'Mecânico'}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">Mecânico...</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="none">
            <span className="text-muted-foreground">Sem mecânico</span>
          </SelectItem>
          {oficinas?.map((oficina) => (
            <SelectItem key={oficina.id} value={oficina.id}>
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span>{oficina.nome}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);

OficinaSelect.displayName = 'OficinaSelect';
