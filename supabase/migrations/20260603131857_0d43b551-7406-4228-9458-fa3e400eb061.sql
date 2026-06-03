-- =========================================================
-- 1. Schema changes
-- =========================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);

-- Backfill: bernardo (e qualquer outro profile) -> MC Terraplenagem
UPDATE public.profiles
SET empresa_id = (SELECT id FROM public.empresas WHERE nome = 'MC Terraplenagem' LIMIT 1)
WHERE empresa_id IS NULL;

ALTER TABLE public.profiles ALTER COLUMN empresa_id SET NOT NULL;

-- veiculos.empresa_id agora obrigatório (já 100% backfilled)
ALTER TABLE public.veiculos ALTER COLUMN empresa_id SET NOT NULL;

-- =========================================================
-- 2. Funções SECURITY DEFINER
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_empresa_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT empresa_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.veiculo_empresa_id(_veiculo_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT empresa_id FROM public.veiculos WHERE id = _veiculo_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.ordem_servico_empresa_id(_os_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.empresa_id
  FROM public.ordens_servico os
  JOIN public.veiculos v ON v.id = os.veiculo_id
  WHERE os.id = _os_id
  LIMIT 1
$$;

-- =========================================================
-- 3. Atualiza handle_new_user para já atribuir empresa MC
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mc_id uuid;
BEGIN
  SELECT id INTO mc_id FROM public.empresas WHERE nome = 'MC Terraplenagem' LIMIT 1;

  INSERT INTO public.profiles (user_id, email, empresa_id)
  VALUES (NEW.id, NEW.email, mc_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- =========================================================
-- 4. DROP policies abertas existentes
-- =========================================================
-- empresas
DROP POLICY IF EXISTS "Authenticated users can insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "Authenticated users can update empresas" ON public.empresas;
DROP POLICY IF EXISTS "Authenticated users can view empresas" ON public.empresas;
-- veiculos
DROP POLICY IF EXISTS "Authenticated users can delete veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Authenticated users can insert veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Authenticated users can update veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Authenticated users can view veiculos" ON public.veiculos;
-- revisoes
DROP POLICY IF EXISTS "Authenticated users can delete revisoes" ON public.revisoes;
DROP POLICY IF EXISTS "Authenticated users can insert revisoes" ON public.revisoes;
DROP POLICY IF EXISTS "Authenticated users can update revisoes" ON public.revisoes;
DROP POLICY IF EXISTS "Authenticated users can view revisoes" ON public.revisoes;
-- tipos_revisao
DROP POLICY IF EXISTS "Authenticated users can insert tipos_revisao" ON public.tipos_revisao;
DROP POLICY IF EXISTS "Authenticated users can update tipos_revisao" ON public.tipos_revisao;
DROP POLICY IF EXISTS "Authenticated users can view tipos_revisao" ON public.tipos_revisao;
-- oficinas
DROP POLICY IF EXISTS "Authenticated users can delete oficinas" ON public.oficinas;
DROP POLICY IF EXISTS "Authenticated users can insert oficinas" ON public.oficinas;
DROP POLICY IF EXISTS "Authenticated users can update oficinas" ON public.oficinas;
DROP POLICY IF EXISTS "Authenticated users can view oficinas" ON public.oficinas;
-- historico_revisoes
DROP POLICY IF EXISTS "Authenticated users can delete historico" ON public.historico_revisoes;
DROP POLICY IF EXISTS "Authenticated users can insert historico" ON public.historico_revisoes;
DROP POLICY IF EXISTS "Authenticated users can update historico" ON public.historico_revisoes;
DROP POLICY IF EXISTS "Authenticated users can view historico" ON public.historico_revisoes;
-- contratos
DROP POLICY IF EXISTS "Authenticated users can view contratos" ON public.contratos;
DROP POLICY IF EXISTS "Authenticated users can insert contratos" ON public.contratos;
DROP POLICY IF EXISTS "Authenticated users can update contratos" ON public.contratos;
DROP POLICY IF EXISTS "Authenticated users can delete contratos" ON public.contratos;
-- ordens_servico
DROP POLICY IF EXISTS "Authenticated users can view ordens_servico" ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated users can insert ordens_servico" ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated users can update ordens_servico" ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated users can delete ordens_servico" ON public.ordens_servico;
-- avarias_fotos
DROP POLICY IF EXISTS "Authenticated users can view avarias_fotos" ON public.avarias_fotos;
DROP POLICY IF EXISTS "Authenticated users can insert avarias_fotos" ON public.avarias_fotos;
DROP POLICY IF EXISTS "Authenticated users can update avarias_fotos" ON public.avarias_fotos;
DROP POLICY IF EXISTS "Authenticated users can delete avarias_fotos" ON public.avarias_fotos;
-- import_logs
DROP POLICY IF EXISTS "Users can insert import logs" ON public.import_logs;
DROP POLICY IF EXISTS "Users can view import logs" ON public.import_logs;
-- profiles & user_roles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- =========================================================
-- 5. Policies novas — escopo por empresa
-- =========================================================

-- VEICULOS
CREATE POLICY "veiculos_select" ON public.veiculos FOR SELECT TO authenticated
USING (empresa_id = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "veiculos_insert" ON public.veiculos FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "veiculos_update" ON public.veiculos FOR UPDATE TO authenticated
USING (empresa_id = public.user_empresa_id() OR public.is_admin())
WITH CHECK (empresa_id = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "veiculos_delete" ON public.veiculos FOR DELETE TO authenticated
USING (empresa_id = public.user_empresa_id() OR public.is_admin());

-- EMPRESAS
CREATE POLICY "empresas_select" ON public.empresas FOR SELECT TO authenticated
USING (id = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "empresas_insert" ON public.empresas FOR INSERT TO authenticated
WITH CHECK (public.is_admin());
CREATE POLICY "empresas_update" ON public.empresas FOR UPDATE TO authenticated
USING (id = public.user_empresa_id() OR public.is_admin())
WITH CHECK (id = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "empresas_delete" ON public.empresas FOR DELETE TO authenticated
USING (public.is_admin());

-- CONTRATOS
CREATE POLICY "contratos_select" ON public.contratos FOR SELECT TO authenticated
USING (empresa_id = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "contratos_insert" ON public.contratos FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "contratos_update" ON public.contratos FOR UPDATE TO authenticated
USING (empresa_id = public.user_empresa_id() OR public.is_admin())
WITH CHECK (empresa_id = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "contratos_delete" ON public.contratos FOR DELETE TO authenticated
USING (empresa_id = public.user_empresa_id() OR public.is_admin());

-- REVISOES (via veículo)
CREATE POLICY "revisoes_select" ON public.revisoes FOR SELECT TO authenticated
USING (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "revisoes_insert" ON public.revisoes FOR INSERT TO authenticated
WITH CHECK (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "revisoes_update" ON public.revisoes FOR UPDATE TO authenticated
USING (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin())
WITH CHECK (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "revisoes_delete" ON public.revisoes FOR DELETE TO authenticated
USING (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin());

-- HISTORICO_REVISOES (via veículo)
CREATE POLICY "historico_select" ON public.historico_revisoes FOR SELECT TO authenticated
USING (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "historico_insert" ON public.historico_revisoes FOR INSERT TO authenticated
WITH CHECK (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "historico_update" ON public.historico_revisoes FOR UPDATE TO authenticated
USING (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin())
WITH CHECK (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "historico_delete" ON public.historico_revisoes FOR DELETE TO authenticated
USING (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin());

-- ORDENS_SERVICO (via veículo)
CREATE POLICY "os_select" ON public.ordens_servico FOR SELECT TO authenticated
USING (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "os_insert" ON public.ordens_servico FOR INSERT TO authenticated
WITH CHECK (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "os_update" ON public.ordens_servico FOR UPDATE TO authenticated
USING (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin())
WITH CHECK (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "os_delete" ON public.ordens_servico FOR DELETE TO authenticated
USING (public.veiculo_empresa_id(veiculo_id) = public.user_empresa_id() OR public.is_admin());

-- AVARIAS_FOTOS (via OS)
CREATE POLICY "avarias_select" ON public.avarias_fotos FOR SELECT TO authenticated
USING (public.ordem_servico_empresa_id(ordem_servico_id) = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "avarias_insert" ON public.avarias_fotos FOR INSERT TO authenticated
WITH CHECK (public.ordem_servico_empresa_id(ordem_servico_id) = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "avarias_update" ON public.avarias_fotos FOR UPDATE TO authenticated
USING (public.ordem_servico_empresa_id(ordem_servico_id) = public.user_empresa_id() OR public.is_admin())
WITH CHECK (public.ordem_servico_empresa_id(ordem_servico_id) = public.user_empresa_id() OR public.is_admin());
CREATE POLICY "avarias_delete" ON public.avarias_fotos FOR DELETE TO authenticated
USING (public.ordem_servico_empresa_id(ordem_servico_id) = public.user_empresa_id() OR public.is_admin());

-- TIPOS_REVISAO (catálogo global; só admin escreve)
CREATE POLICY "tipos_select" ON public.tipos_revisao FOR SELECT TO authenticated USING (true);
CREATE POLICY "tipos_insert" ON public.tipos_revisao FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "tipos_update" ON public.tipos_revisao FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "tipos_delete" ON public.tipos_revisao FOR DELETE TO authenticated USING (public.is_admin());

-- OFICINAS (catálogo global; só admin escreve)
CREATE POLICY "oficinas_select" ON public.oficinas FOR SELECT TO authenticated USING (true);
CREATE POLICY "oficinas_insert" ON public.oficinas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "oficinas_update" ON public.oficinas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "oficinas_delete" ON public.oficinas FOR DELETE TO authenticated USING (public.is_admin());

-- IMPORT_LOGS (próprio user; admin vê todos)
CREATE POLICY "import_logs_select" ON public.import_logs FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "import_logs_insert" ON public.import_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- PROFILES (próprio user; admin vê todos)
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- USER_ROLES (próprio user; admin vê todos)
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());