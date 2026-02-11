-- Add document columns to veiculos table
ALTER TABLE public.veiculos 
ADD COLUMN crlv_url TEXT,
ADD COLUMN tacografo_url TEXT,
ADD COLUMN documento_url TEXT;

-- Create storage bucket for vehicle documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos-veiculos', 'documentos-veiculos', false);

-- Storage policies for authenticated users
CREATE POLICY "Authenticated users can upload vehicle documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos-veiculos');

CREATE POLICY "Authenticated users can view vehicle documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documentos-veiculos');

CREATE POLICY "Authenticated users can update vehicle documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos-veiculos');

CREATE POLICY "Authenticated users can delete vehicle documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documentos-veiculos');