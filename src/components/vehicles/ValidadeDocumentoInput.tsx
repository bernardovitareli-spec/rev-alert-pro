import { useState, forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { calcularStatusDocumento, getDocumentStatusBadgeClass } from '@/lib/documentCalculations';
import { DocumentStatus } from '@/types/fleet';

interface ValidadeDocumentoInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  label?: string;
}

export const ValidadeDocumentoInput = forwardRef<HTMLButtonElement, ValidadeDocumentoInputProps>(
  ({ value, onChange, disabled = false, label = "Validade" }, ref) => {
    const [open, setOpen] = useState(false);
    
    const statusInfo = calcularStatusDocumento(value);

    const handleSelect = (date: Date | undefined) => {
      if (date) {
        onChange(format(date, 'yyyy-MM-dd'));
      }
      setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
    };

    const getStatusIcon = (status: DocumentStatus) => {
      switch (status) {
        case 'vencido':
          return <AlertCircle className="h-3.5 w-3.5" />;
        case 'atencao':
          return <AlertTriangle className="h-3.5 w-3.5" />;
        case 'ok':
          return <CheckCircle className="h-3.5 w-3.5" />;
        default:
          return null;
      }
    };

    return (
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !value && 'text-muted-foreground'
              )}
              disabled={disabled}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              {value ? (
                format(new Date(value), "dd/MM/yyyy", { locale: ptBR })
              ) : (
                <span>Definir validade</span>
              )}
              {value && (
                <X 
                  className="ml-auto h-4 w-4 opacity-50 hover:opacity-100" 
                  onClick={handleClear}
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover" align="start">
            <Calendar
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={handleSelect}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        {value && statusInfo.status !== 'indefinido' && (
          <Badge className={cn("gap-1 text-xs", getDocumentStatusBadgeClass(statusInfo.status))}>
            {getStatusIcon(statusInfo.status)}
            {statusInfo.label}
          </Badge>
        )}
      </div>
    );
  }
);

ValidadeDocumentoInput.displayName = 'ValidadeDocumentoInput';
