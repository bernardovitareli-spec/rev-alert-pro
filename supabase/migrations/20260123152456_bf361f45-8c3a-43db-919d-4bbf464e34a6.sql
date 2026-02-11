-- Adicionar coluna de previsão de entrega na tabela revisoes
ALTER TABLE revisoes 
ADD COLUMN previsao_entrega date DEFAULT NULL;