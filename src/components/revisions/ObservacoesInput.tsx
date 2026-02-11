import { useState, useEffect, useCallback, forwardRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ObservacoesInputProps {
  value: string | null;
  onChange: (value: string | null) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export const ObservacoesInput = forwardRef<HTMLDivElement, ObservacoesInputProps>(
  ({ value, onChange, disabled = false, placeholder = "Adicionar observações..." }, ref) => {
    const [inputValue, setInputValue] = useState(value || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
      setInputValue(value || '');
    }, [value]);

    const debouncedSave = useCallback(async (newValue: string) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const id = setTimeout(async () => {
        setIsSaving(true);
        try {
          await onChange(newValue || null);
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2000);
        } finally {
          setIsSaving(false);
        }
      }, 1000); // Debounce de 1 segundo

      setTimeoutId(id);
    }, [onChange, timeoutId]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setIsSaved(false);
      debouncedSave(newValue);
    };

    return (
      <div ref={ref} className="space-y-1">
        <div className="relative">
          <Textarea
            value={inputValue}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            rows={3}
            className="resize-none pr-10"
          />
          <div className="absolute right-3 top-3">
            {isSaving && (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            )}
            {isSaved && !isSaving && (
              <Check className="h-4 w-4 text-status-ok" />
            )}
            {!isSaving && !isSaved && (
              <MessageSquare className="h-4 w-4 text-muted-foreground opacity-50" />
            )}
          </div>
        </div>
        {isSaved && (
          <p className="text-xs text-status-ok">Salvo automaticamente</p>
        )}
      </div>
    );
  }
);

ObservacoesInput.displayName = 'ObservacoesInput';
