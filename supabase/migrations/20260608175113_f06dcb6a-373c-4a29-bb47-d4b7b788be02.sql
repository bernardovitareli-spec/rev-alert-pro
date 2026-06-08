
-- Função helper para checar papel apontador
CREATE OR REPLACE FUNCTION public.is_apontador()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'apontador'
  )
$$;

-- Trigger que restringe quais colunas o apontador pode alterar em veiculos
CREATE OR REPLACE FUNCTION public.veiculos_enforce_apontador_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_filtered jsonb;
  new_filtered jsonb;
BEGIN
  IF public.is_apontador() AND NOT public.is_admin() THEN
    old_filtered := to_jsonb(OLD)
      - 'km_atual' - 'hora_atual' - 'ultima_atualizacao' - 'retorno_patio' - 'updated_at';
    new_filtered := to_jsonb(NEW)
      - 'km_atual' - 'hora_atual' - 'ultima_atualizacao' - 'retorno_patio' - 'updated_at';

    IF old_filtered IS DISTINCT FROM new_filtered THEN
      RAISE EXCEPTION 'Apontador só pode atualizar Km/Hr e Retorno ao Pátio';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS veiculos_apontador_guard ON public.veiculos;
CREATE TRIGGER veiculos_apontador_guard
BEFORE UPDATE ON public.veiculos
FOR EACH ROW EXECUTE FUNCTION public.veiculos_enforce_apontador_columns();

-- Policy explícita permitindo apontador atualizar veiculos (colunas blindadas pelo trigger)
DROP POLICY IF EXISTS "veiculos_update_apontador" ON public.veiculos;
CREATE POLICY "veiculos_update_apontador"
ON public.veiculos
FOR UPDATE
TO authenticated
USING (public.is_apontador())
WITH CHECK (public.is_apontador());
