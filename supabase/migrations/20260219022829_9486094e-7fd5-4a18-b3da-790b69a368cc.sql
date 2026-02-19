
-- Criar tabela contratos
CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view contratos"
  ON public.contratos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contratos"
  ON public.contratos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contratos"
  ON public.contratos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete contratos"
  ON public.contratos FOR DELETE
  TO authenticated
  USING (true);

-- Adicionar coluna contrato_id em veiculos
ALTER TABLE public.veiculos
  ADD COLUMN contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL;
