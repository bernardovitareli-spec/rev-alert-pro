
-- 1) Storage: drop old permissive INSERT/UPDATE/DELETE policies and recreate with ownership checks

-- avarias-fotos (path: <ordem_servico_id>/...)
DROP POLICY IF EXISTS "Authenticated users can delete avarias fotos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avarias fotos" ON storage.objects;

CREATE POLICY "avarias_fotos_insert_empresa" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avarias-fotos'
  AND (public.is_admin() OR public.ordem_servico_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id())
);
CREATE POLICY "avarias_fotos_update_empresa" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avarias-fotos'
  AND (public.is_admin() OR public.ordem_servico_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id())
)
WITH CHECK (
  bucket_id = 'avarias-fotos'
  AND (public.is_admin() OR public.ordem_servico_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id())
);
CREATE POLICY "avarias_fotos_delete_empresa" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avarias-fotos'
  AND (public.is_admin() OR public.ordem_servico_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id())
);

-- documentos-veiculos (path: <veiculo_id>/...)
DROP POLICY IF EXISTS "Authenticated users can delete documentos-veiculos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documentos-veiculos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documentos-veiculos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vehicle documents" ON storage.objects;

CREATE POLICY "documentos_veiculos_insert_empresa" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos-veiculos'
  AND (public.is_admin() OR public.veiculo_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id())
);
CREATE POLICY "documentos_veiculos_update_empresa" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documentos-veiculos'
  AND (public.is_admin() OR public.veiculo_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id())
)
WITH CHECK (
  bucket_id = 'documentos-veiculos'
  AND (public.is_admin() OR public.veiculo_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id())
);
CREATE POLICY "documentos_veiculos_delete_empresa" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos-veiculos'
  AND (public.is_admin() OR public.veiculo_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id())
);

-- notas-fiscais (path: <revisao_id>/...)
DROP POLICY IF EXISTS "Authenticated users can delete notas fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete notas-fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update notas fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update notas-fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload notas fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload notas-fiscais" ON storage.objects;

CREATE POLICY "notas_fiscais_insert_empresa" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'notas-fiscais'
  AND (public.is_admin() OR public.revisao_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id())
);
CREATE POLICY "notas_fiscais_update_empresa" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'notas-fiscais'
  AND (public.is_admin() OR public.revisao_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id())
)
WITH CHECK (
  bucket_id = 'notas-fiscais'
  AND (public.is_admin() OR public.revisao_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id())
);
CREATE POLICY "notas_fiscais_delete_empresa" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'notas-fiscais'
  AND (public.is_admin() OR public.revisao_empresa_id(((storage.foldername(name))[1])::uuid) = public.user_empresa_id())
);

-- 2) user_roles: restrict INSERT/UPDATE/DELETE to admins only
CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update user roles" ON public.user_roles FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE TO authenticated
USING (public.is_admin());

-- 3) Revoke EXECUTE on SECURITY DEFINER functions from anon/public; keep authenticated
REVOKE EXECUTE ON FUNCTION public.get_fleet_kpis(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_empresa_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.veiculo_empresa_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ordem_servico_empresa_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revisao_empresa_id(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_fleet_kpis(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.veiculo_empresa_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ordem_servico_empresa_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revisao_empresa_id(uuid) TO authenticated;
