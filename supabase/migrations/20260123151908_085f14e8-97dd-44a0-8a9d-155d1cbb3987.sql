-- Criar enum para status de execução
CREATE TYPE execution_status AS ENUM ('nao_realizada', 'em_servico', 'realizada');

-- Adicionar coluna na tabela revisoes com valor default
ALTER TABLE revisoes 
ADD COLUMN status_execucao execution_status NOT NULL DEFAULT 'nao_realizada';