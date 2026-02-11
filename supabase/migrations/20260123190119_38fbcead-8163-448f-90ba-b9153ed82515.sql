-- Tornar bucket notas-fiscais público
UPDATE storage.buckets SET public = true WHERE id = 'notas-fiscais';

-- Tornar bucket documentos-veiculos público
UPDATE storage.buckets SET public = true WHERE id = 'documentos-veiculos';

-- Criar políticas de acesso público para leitura
CREATE POLICY "Public read access for notas-fiscais"
ON storage.objects FOR SELECT
USING (bucket_id = 'notas-fiscais');

CREATE POLICY "Authenticated users can upload notas-fiscais"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'notas-fiscais' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update notas-fiscais"
ON storage.objects FOR UPDATE
USING (bucket_id = 'notas-fiscais' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete notas-fiscais"
ON storage.objects FOR DELETE
USING (bucket_id = 'notas-fiscais' AND auth.role() = 'authenticated');

CREATE POLICY "Public read access for documentos-veiculos"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos-veiculos');

CREATE POLICY "Authenticated users can upload documentos-veiculos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documentos-veiculos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update documentos-veiculos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documentos-veiculos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete documentos-veiculos"
ON storage.objects FOR DELETE
USING (bucket_id = 'documentos-veiculos' AND auth.role() = 'authenticated');