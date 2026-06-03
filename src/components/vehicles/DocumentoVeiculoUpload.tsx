import { useState, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Loader2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractObjectPath, openSigned } from '@/lib/signedUrl';

interface DocumentoVeiculoUploadProps {
  veiculoId: string;
  tipoDocumento: 'crlv' | 'tacografo' | 'documento' | 'art';
  label: string;
  value: string | null;
  onChange: (url: string | null) => Promise<void>;
  disabled?: boolean;
}

export const DocumentoVeiculoUpload = forwardRef<HTMLDivElement, DocumentoVeiculoUploadProps>(
  ({ veiculoId, tipoDocumento, label, value, onChange, disabled }, ref) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Formato não suportado. Use PDF, JPG, PNG ou WEBP.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }

      setIsUploading(true);
      try {
        const timestamp = Date.now();
        const ext = file.name.split('.').pop();
        const filePath = `${veiculoId}/${tipoDocumento}/${timestamp}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('documentos-veiculos')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documentos-veiculos')
          .getPublicUrl(filePath);

        await onChange(publicUrl);
        toast.success(`${label} anexado com sucesso!`);
      } catch (error) {
        console.error('Error uploading document:', error);
        toast.error(`Erro ao anexar ${label}`);
      } finally {
        setIsUploading(false);
        event.target.value = '';
      }
    };

    const handleRemove = async () => {
      if (!value) return;

      setIsRemoving(true);
      try {
        // Extract file path from URL
        const url = new URL(value);
        const pathParts = url.pathname.split('/documentos-veiculos/');
        if (pathParts.length > 1) {
          const filePath = decodeURIComponent(pathParts[1]);
          await supabase.storage
            .from('documentos-veiculos')
            .remove([filePath]);
        }

        await onChange(null);
        toast.success(`${label} removido com sucesso!`);
      } catch (error) {
        console.error('Error removing document:', error);
        toast.error(`Erro ao remover ${label}`);
      } finally {
        setIsRemoving(false);
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
          <span className="text-sm">Enviando...</span>
        </div>
      );
    }

    if (value) {
      return (
        <div ref={ref} className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleView}
            className="gap-1"
          >
            <Eye className="h-4 w-4" />
            Ver Anexo
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={disabled || isRemoving}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            {isRemoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      );
    }

    return (
      <div ref={ref}>
        <input
          type="file"
          id={`doc-upload-${veiculoId}-${tipoDocumento}`}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleUpload}
          disabled={disabled}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById(`doc-upload-${veiculoId}-${tipoDocumento}`)?.click()}
          disabled={disabled}
          className="gap-1"
        >
          <Upload className="h-4 w-4" />
          Anexar
        </Button>
      </div>
    );
  }
);

DocumentoVeiculoUpload.displayName = 'DocumentoVeiculoUpload';
