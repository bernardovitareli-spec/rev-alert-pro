import { useSignedUrl } from '@/lib/signedUrl';
import { Skeleton } from '@/components/ui/skeleton';

interface AvariaFotoThumbProps {
  urlOrPath: string;
  alt?: string;
}

export function AvariaFotoThumb({ urlOrPath, alt }: AvariaFotoThumbProps) {
  const { url, loading } = useSignedUrl('avarias-fotos', urlOrPath);

  if (loading) {
    return <Skeleton className="h-32 w-full rounded-md" />;
  }
  if (!url) {
    return (
      <div className="h-32 w-full rounded-md border border-border flex items-center justify-center text-xs text-muted-foreground">
        Indisponível
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <img
        src={url}
        alt={alt || 'Foto da avaria'}
        className="w-full h-32 object-cover rounded-md border border-border hover:opacity-90 transition-opacity"
      />
    </a>
  );
}
