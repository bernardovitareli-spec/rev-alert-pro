-- 1. Campos na tabela revisoes
ALTER TABLE revisoes ADD COLUMN IF NOT EXISTS valor DECIMAL(10,2);
ALTER TABLE revisoes ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 2. Campos na tabela veiculos para validade de documentos
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS crlv_validade DATE;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tacografo_validade DATE;

-- 3. Tabela de histórico de revisões realizadas
CREATE TABLE IF NOT EXISTS historico_revisoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revisao_id UUID REFERENCES revisoes(id) ON DELETE SET NULL,
  veiculo_id UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  tipo_revisao_id UUID NOT NULL REFERENCES tipos_revisao(id),
  oficina_id UUID REFERENCES oficinas(id) ON DELETE SET NULL,
  data_realizacao DATE NOT NULL DEFAULT CURRENT_DATE,
  km_realizacao INTEGER,
  hora_realizacao INTEGER,
  valor DECIMAL(10,2),
  ordem_servico TEXT,
  nota_fiscal_url TEXT,
  observacoes TEXT,
  tempo_servico_dias INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Índices para performance em relatórios
CREATE INDEX IF NOT EXISTS idx_historico_veiculo ON historico_revisoes(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_historico_oficina ON historico_revisoes(oficina_id);
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_revisoes(data_realizacao);
CREATE INDEX IF NOT EXISTS idx_historico_tipo ON historico_revisoes(tipo_revisao_id);
CREATE INDEX IF NOT EXISTS idx_revisoes_valor ON revisoes(valor);

-- 5. RLS para histórico
ALTER TABLE historico_revisoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view historico" ON historico_revisoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert historico" ON historico_revisoes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update historico" ON historico_revisoes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete historico" ON historico_revisoes
  FOR DELETE TO authenticated USING (true);