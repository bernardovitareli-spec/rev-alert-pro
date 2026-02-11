import { useState, forwardRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface PrevisaoEntregaInputProps {
  value: string | null;
  onChange: (date: string | null) => void;
  disabled?: boolean;
}

export const PrevisaoEntregaInput = forwardRef<HTMLButtonElement, PrevisaoEntregaInputProps>(
  ({ value, onChange, disabled = false }, ref) => {
    const [open, setOpen] = useState(false);

    const date = value ? parseISO(value) : undefined;

    const handleSelect = (selectedDate: Date | undefined) => {
      if (selectedDate) {
        onChange(format(selectedDate, 'yyyy-MM-dd'));
      }
      setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            size="sm"
            className={cn(
              'h-8 w-[130px] justify-start text-left font-normal text-xs',
              !value && 'text-muted-foreground',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : 'Definir'}
            {value && !disabled && (
              <X
                className="ml-auto h-3.5 w-3.5 hover:text-destructive"
                onClick={handleClear}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

PrevisaoEntregaInput.displayName = 'PrevisaoEntregaInput';

export function PrevisaoEntregaBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground text-xs">-</span>;
  
  const parsed = parseISO(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const isOverdue = parsed < today;
  const isToday = parsed.toDateString() === today.toDateString();
  
  return (
    <span className={cn(
      'text-xs font-medium',
      isOverdue && 'text-destructive',
      isToday && 'text-amber-600',
      !isOverdue && !isToday && 'text-muted-foreground'
    )}>
      {format(parsed, 'dd/MM/yyyy', { locale: ptBR })}
    </span>
  );
}
