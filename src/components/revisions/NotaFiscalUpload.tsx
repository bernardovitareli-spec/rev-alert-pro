import { useState, useRef, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Upload, X, ExternalLink, Loader2, FileIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NotaFiscalUploadProps {
  revisaoId: string;
  value: string | null;
  onChange: (url: string | null) => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}

export const NotaFiscalUpload = forwardRef<HTMLDivElement, NotaFiscalUploadProps>(
  ({ revisaoId, value, onChange, disabled, compact }, ref) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WEBP.');
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }

      setIsUploading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${revisaoId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('notas-fiscais')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('notas-fiscais')
          .getPublicUrl(fileName);

        await onChange(urlData.publicUrl);
        toast.success('Nota fiscal anexada com sucesso!');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Erro ao enviar arquivo');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    const handleRemove = async () => {
      if (!value) return;
      
      try {
        // Extract file path from URL
        const urlParts = value.split('/notas-fiscais/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('notas-fiscais').remove([filePath]);
        }
        
        await onChange(null);
        toast.success('Anexo removido');
      } catch (error) {
        console.error('Remove error:', error);
        toast.error('Erro ao remover anexo');
      }
    };

    const handleView = () => {
      if (value) {
        window.open(value, '_blank');
      }
    };

    if (isUploading) {
      return (
        <div ref={ref} className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className={cn("text-sm", compact && "text-xs")}>Enviando...</span>
        </div>
      );
    }

    if (value) {
      return (
        <div ref={ref} className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleView}
            className={cn("h-8 gap-1.5", compact && "text-xs")}
          >
            <FileIcon className="h-3.5 w-3.5" />
            Ver Anexo
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={disabled}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    }

    return (
      <div ref={ref}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "h-8 gap-1.5 text-muted-foreground",
            compact && "text-xs"
          )}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Anexar NF
        </Button>
      </div>
    );
  }
);

NotaFiscalUpload.displayName = 'NotaFiscalUpload';
