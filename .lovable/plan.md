

## Controle de Entrada / Saída de Equipamentos

### Resumo
Nova seção no menu principal para registrar entrada e saída de equipamentos na oficina, com suporte a manutenções corretivas (com subcategorias) e preventivas (integradas com Tipos de Revisão), registro de avarias com fotos, e checklist de saída.

### 1. Banco de dados

**Nova tabela `ordens_servico`** — registro principal de entrada/saída:
- `id`, `veiculo_id` (FK veiculos), `tipo_manutencao` (enum: preventiva/corretiva)
- `subcategoria_corretiva` (enum: borracharia/mecanica/eletrica/ar_condicionado/outros — nullable, só para corretiva)
- `detalhamento` (text — descrição livre em cascata)
- `tipo_revisao_id` (FK tipos_revisao — nullable, usado apenas para preventiva)
- `data_entrada`, `km_entrada`, `horimetro_entrada`
- `tem_avarias` (boolean), `descricao_avarias` (text)
- `previsao_saida` (date)
- `data_saida` (date nullable), `km_saida` (integer nullable), `horimetro_saida` (integer nullable)
- `avarias_resolvidas` (boolean nullable), `observacoes_saida` (text nullable)
- `status` (enum: aberta/em_andamento/concluida)
- `created_at`, `updated_at`
- RLS: CRUD para authenticated

**Nova tabela `avarias_fotos`** — fotos das avarias:
- `id`, `ordem_servico_id` (FK ordens_servico), `foto_url` (text), `descricao` (text nullable), `created_at`
- RLS: CRUD para authenticated

**Novo bucket de storage** `avarias-fotos` (público).

### 2. Menu — `AppSidebar.tsx`
- Adicionar item "Controle Entrada/Saída" com ícone `ClipboardList` entre Calendário e Relatórios
- Rota: `/controle-entrada-saida`

### 3. Página — `src/pages/ControleEntradaSaida.tsx`
Página principal com:
- **Lista de ordens** em cards/tabela com status (Aberta, Em Andamento, Concluída), filtros por tipo e status
- **Botão "Nova Entrada"** abre dialog/formulário com:
  - Seleção do veículo (select dos veículos cadastrados)
  - Data de Chegada, KM de Chegada, Horímetro de Chegada
  - Tipo: Corretiva ou Preventiva
  - Se **Corretiva**: subcategoria (Borracharia, Mecânica, Elétrica, Ar Condicionado, Outros) + campo de detalhamento em cascata
  - Se **Preventiva**: select dos Tipos de Revisão existentes (calculados com base no KM/Horímetro informados)
  - Tem Avarias? (Sim/Não) → se Sim: descrição + upload de fotos múltiplas
  - Previsão de Saída
- **Registrar Saída** (em ordem existente): Data de saída, KM de saída, Horímetro de saída, Avarias resolvidas? (Sim/Não), Observações finais

### 4. Rota — `App.tsx`
- Adicionar `/controle-entrada-saida` como rota protegida

### 5. Tipos — `src/types/fleet.ts`
- Adicionar tipos `TipoManutencao`, `SubcategoriaCorretiva`, `StatusOrdemServico`, `OrdemServico`, `AvariaFoto`

### 6. Hook — `src/hooks/useOrdensServico.tsx`
- CRUD de ordens de serviço com queries e mutations
- Upload de fotos de avarias para o bucket

### Arquivos criados/alterados
- **Criados**: `src/pages/ControleEntradaSaida.tsx`, `src/hooks/useOrdensServico.tsx`
- **Alterados**: `src/components/layout/AppSidebar.tsx`, `src/App.tsx`, `src/types/fleet.ts`
- **Migração**: criar tabelas `ordens_servico`, `avarias_fotos`, bucket `avarias-fotos`

