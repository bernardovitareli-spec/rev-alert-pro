import { useState, useEffect, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrdemServicoInputProps {
  value: string | null;
  onChange: (value: string | null) => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}

export const OrdemServicoInput = forwardRef<HTMLDivElement, OrdemServicoInputProps>(
  ({ value, onChange, disabled, compact }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
      setInputValue(value || '');
    }, [value]);

    const handleSave = async () => {
      setIsSaving(true);
      try {
        await onChange(inputValue.trim() || null);
        setIsEditing(false);
      } finally {
        setIsSaving(false);
      }
    };

    const handleCancel = () => {
      setInputValue(value || '');
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    };

    if (isEditing) {
      return (
        <div ref={ref} className="flex items-center gap-1">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nº da OS"
            disabled={isSaving}
            className={cn("h-8", compact && "text-xs")}
            autoFocus
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div ref={ref}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          disabled={disabled}
          className={cn(
            "h-8 gap-1.5 text-left justify-start",
            compact && "text-xs",
            !value && "text-muted-foreground"
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          {value || 'Adicionar OS'}
        </Button>
      </div>
    );
  }
);

OrdemServicoInput.displayName = 'OrdemServicoInput';
