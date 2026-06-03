
-- Helper functions to check ownership of storage paths
CREATE OR REPLACE FUNCTION public.revisao_empresa_id(_revisao_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.empresa_id
  FROM public.revisoes r
  JOIN public.veiculos v ON v.id = r.veiculo_id
  WHERE r.id = _revisao_id
  LIMIT 1
$$;

-- Drop old SELECT policies for these buckets
DROP POLICY IF EXISTS "Public read access for documentos-veiculos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for notas-fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avarias fotos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view notas fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view vehicle documents" ON storage.objects;

-- New SELECT policies: authenticated AND owner-empresa (or admin)
-- documentos-veiculos: path = {veiculo_id}/{tipo}/{file}
CREATE POLICY "documentos_veiculos_select_empresa"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos-veiculos'
  AND (
    public.is_admin()
    OR public.veiculo_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id()
  )
);

-- notas-fiscais: path = {revisao_id}/{file}
CREATE POLICY "notas_fiscais_select_empresa"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'notas-fiscais'
  AND (
    public.is_admin()
    OR public.revisao_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id()
  )
);

-- avarias-fotos: path = {ordem_servico_id}/{file}
CREATE POLICY "avarias_fotos_select_empresa"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avarias-fotos'
  AND (
    public.is_admin()
    OR public.ordem_servico_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id()
  )
);
