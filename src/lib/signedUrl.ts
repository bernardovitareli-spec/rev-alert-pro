import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export type StorageBucket = 'notas-fiscais' | 'documentos-veiculos' | 'avarias-fotos';

/**
 * Aceita uma URL pública antiga (com /storage/v1/object/public/{bucket}/{path})
 * ou apenas o path do objeto, e devolve o path limpo do objeto dentro do bucket.
 */
export function extractObjectPath(bucket: StorageBucket, urlOrPath: string): string {
  if (!urlOrPath) return urlOrPath;
  // Tenta como URL completa
  try {
    const u = new URL(urlOrPath);
    const marker = `/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx >= 0) {
      return decodeURIComponent(u.pathname.slice(idx + marker.length));
    }
  } catch {
    // não é URL, segue
  }
  // Pode vir com prefixo do bucket sem ser URL
  const prefix = `${bucket}/`;
  if (urlOrPath.startsWith(prefix)) return urlOrPath.slice(prefix.length);
  return urlOrPath;
}

/**
 * Gera uma signed URL com expiração padrão de 60 minutos.
 */
export async function getSignedUrl(
  bucket: StorageBucket,
  urlOrPath: string,
  expiresIn: number = 3600,
): Promise<string | null> {
  if (!urlOrPath) return null;
  const path = extractObjectPath(bucket, urlOrPath);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) {
    console.error('createSignedUrl error:', error);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Hook para renderização: resolve assincronamente a signed URL.
 */
export function useSignedUrl(bucket: StorageBucket, urlOrPath: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!urlOrPath);

  useEffect(() => {
    let cancelled = false;
    if (!urlOrPath) {
      setUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getSignedUrl(bucket, urlOrPath).then((u) => {
      if (cancelled) return;
      setUrl(u);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [bucket, urlOrPath]);

  return { url, loading };
}

/** Abre a signed URL em uma nova aba. */
export async function openSigned(bucket: StorageBucket, urlOrPath: string) {
  const signed = await getSignedUrl(bucket, urlOrPath);
  if (signed) window.open(signed, '_blank', 'noopener,noreferrer');
}
