
## Adicionar "Atualizar Empresa" e "Atualizar Contrato" na Tela de Detalhamento do Veículo

### Objetivo
Adicionar dois novos fluxos de edição inline na tela de detalhamento do veículo:
1. **Empresa** — alterar a empresa vinculada ao veículo (campo `empresa_id`, já existe no banco)
2. **Contrato** — registrar um número/identificação de contrato (campo `contrato`, novo, será adicionado ao banco)

---

### Banco de Dados — Migração Necessária

Será criada uma migration SQL para adicionar a coluna `contrato` na tabela `veiculos`:

```sql
ALTER TABLE public.veiculos
ADD COLUMN contrato text NULL;
```

Nenhuma outra alteração é necessária no banco — `empresa_id` já existe e as políticas de segurança (RLS) para atualizar veículos já estão habilitadas.

---

### Arquivos a Modificar

**1. `src/hooks/useFleetData.tsx`**
- Adicionar `empresa_id` e `contrato` como parâmetros aceitos pelo hook `useUpdateVeiculo`
- Incluir os campos no objeto `updateData` enviado ao banco

**2. `src/types/fleet.ts`**
- Adicionar o campo `contrato: string | null` na interface `Veiculo`

**3. `src/pages/VeiculoDetalhe.tsx`**
- Adicionar novos estados:
  - `empresaIdEdit` e `isEditingEmpresa` para o fluxo de Empresa
  - `contratoEdit` e `isEditingContrato` para o fluxo de Contrato
- Adicionar funções de controle:
  - `handleStartEditEmpresa`, `handleCancelEditEmpresa`, `handleSaveEmpresa`
  - `handleStartEditContrato`, `handleCancelEditContrato`, `handleSaveContrato`
- Atualizar o campo **Empresa** no grid de informações: ao clicar em "Atualizar Empresa", o campo vira um `Select` com todas as empresas cadastradas (usando o hook `useEmpresas` já existente)
- Adicionar novo campo **Contrato** no grid de informações com modo de edição via `Input` de texto
- Adicionar dois novos botões na barra de ações (junto aos botões KM/Horímetro e Tag da Obra):
  - `[ 🏢 Atualizar Empresa ]`
  - `[ 📄 Atualizar Contrato ]`

---

### Fluxo do Usuário — Empresa

1. Usuário vê o campo "Empresa" exibindo o nome atual (ex: "Empresa ABC" ou "Não definida")
2. Clica em "Atualizar Empresa"
3. O campo vira um dropdown com lista de todas as empresas cadastradas
4. Usuário seleciona a empresa desejada e clica em "Salvar Empresa"
5. O sistema salva o `empresa_id` no banco e exibe mensagem de sucesso
6. O campo volta ao modo de exibição com o novo nome

### Fluxo do Usuário — Contrato

1. Usuário vê o campo "Contrato" exibindo o valor atual (ex: "CT-2025-001" ou "Não definido")
2. Clica em "Atualizar Contrato"
3. O campo vira um `Input` de texto editável
4. Usuário digita o número/identificação do contrato e clica em "Salvar Contrato"
5. O sistema salva o valor no banco e exibe mensagem de sucesso
6. O campo volta ao modo de exibição com o novo valor

---

### Detalhes Técnicos

- **Seleção de empresa:** O hook `useEmpresas()` já existe em `useFleetData.tsx` e retorna a lista de empresas. Será importado e usado para montar o `Select` com as opções disponíveis.
- **Independência dos fluxos:** Cada botão de edição bloqueia os demais enquanto está ativo, exatamente como funciona o botão de Tag da Obra hoje.
- **Nenhum campo obrigatório novo:** `contrato` terá valor padrão `NULL`, sem impacto em dados existentes.
- **Nenhuma nova dependência de pacote:** O componente `Select` do Radix UI já está instalado e em uso no projeto.
