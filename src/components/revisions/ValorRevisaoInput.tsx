import { useState, useEffect, useCallback, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { DollarSign, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValorRevisaoInputProps {
  value: number | null;
  onChange: (value: number | null) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export const ValorRevisaoInput = forwardRef<HTMLDivElement, ValorRevisaoInputProps>(
  ({ value, onChange, disabled = false, placeholder = "0,00" }, ref) => {
    const [inputValue, setInputValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
      if (value !== null && value !== undefined) {
        setInputValue(value.toFixed(2).replace('.', ','));
      } else {
        setInputValue('');
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let rawValue = e.target.value;
      
      // Remove tudo exceto números e vírgula
      rawValue = rawValue.replace(/[^0-9,]/g, '');
      
      // Garante apenas uma vírgula
      const parts = rawValue.split(',');
      if (parts.length > 2) {
        rawValue = parts[0] + ',' + parts.slice(1).join('');
      }
      
      // Limita decimais a 2
      if (parts.length === 2 && parts[1].length > 2) {
        rawValue = parts[0] + ',' + parts[1].slice(0, 2);
      }
      
      setInputValue(rawValue);
      setIsSaved(false);
    };

    const handleBlur = useCallback(async () => {
      if (inputValue === '') {
        if (value !== null) {
          setIsSaving(true);
          try {
            await onChange(null);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
          } finally {
            setIsSaving(false);
          }
        }
        return;
      }

      const numericValue = parseFloat(inputValue.replace(',', '.'));
      if (!isNaN(numericValue)) {
        // Só salva se o valor realmente mudou
        if (numericValue !== value) {
          setIsSaving(true);
          try {
            await onChange(numericValue);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
          } finally {
            setIsSaving(false);
          }
        }
        setInputValue(numericValue.toFixed(2).replace('.', ','));
      } else {
        setInputValue('');
        if (value !== null) {
          setIsSaving(true);
          try {
            await onChange(null);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
          } finally {
            setIsSaving(false);
          }
        }
      }
    }, [inputValue, value, onChange]);

    return (
      <div ref={ref} className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled || isSaving}
          placeholder={placeholder}
          className={cn("pl-10 pr-8", isSaving && "opacity-70")}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isSaving && (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          )}
          {isSaved && !isSaving && (
            <Check className="h-4 w-4 text-status-ok" />
          )}
        </div>
      </div>
    );
  }
);

ValorRevisaoInput.displayName = 'ValorRevisaoInput';
