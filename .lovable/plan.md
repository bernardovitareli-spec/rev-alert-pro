
## Adicionar Gestão de Contratos por Empresa

### Contexto

Atualmente, o campo `contrato` em veículos é um texto livre sem vínculo estruturado. O usuário quer que contratos sejam entidades próprias, cada uma **pertencendo a uma empresa específica**, e que um veículo possa ser associado a um contrato específico (e não apenas digitar um texto).

---

### O que será criado

#### 1. Nova tabela no banco de dados: `contratos`

```sql
CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Com políticas RLS para usuários autenticados (SELECT, INSERT, UPDATE, DELETE).

---

#### 2. Nova coluna na tabela `veiculos`: `contrato_id`

Além do campo texto livre `contrato` já existente, será adicionada a coluna `contrato_id` (FK para a nova tabela), permitindo vincular formalmente o veículo a um contrato cadastrado.

```sql
ALTER TABLE public.veiculos ADD COLUMN contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL;
```

---

#### 3. Página `Empresas.tsx` — novo visual expandido

Cada empresa na tabela ganhará um botão **"+ Novo Contrato"** e uma seção expansível (accordion/collapse) exibindo os contratos vinculados:

```
┌─────────────────────────────────────────────────────────┐
│ Nome            │ Criado em   │ Ações                   │
├─────────────────────────────────────────────────────────┤
│ ▶ Civil Master  │ 18/02/2026  │ ✏️  🗑️  + Novo Contrato │
│   └── Contrato 001 - Terraplanagem S11D    ✏️  🗑️       │
│   └── Contrato 002 - Manutenção Geral      ✏️  🗑️       │
├─────────────────────────────────────────────────────────┤
│ ▶ Ápia          │ 18/02/2026  │ ✏️  🗑️  + Novo Contrato │
│   └── (Nenhum contrato)                                 │
└─────────────────────────────────────────────────────────┘
```

O dialog de criação/edição de contrato pedirá apenas **Nome** e **Descrição (opcional)**, já pré-vinculado à empresa selecionada.

---

#### 4. Hook `useContratos.tsx` (novo)

Novo hook para consultar, criar, editar e excluir contratos, similar ao padrão já existente em `useOficinas.tsx`:

- `useContratos(empresaId?)` — lista todos ou filtra por empresa
- `useCreateContrato()`
- `useUpdateContrato()`
- `useDeleteContrato()`

---

#### 5. Tela de detalhamento do veículo (`VeiculoDetalhe.tsx`)

O campo "Atualizar Contrato" que hoje aceita texto livre será **substituído por um Select** que lista os contratos cadastrados, filtrando automaticamente pelos contratos da empresa vinculada ao veículo. Isso garante consistência de dados.

---

#### 6. Importação via planilha (`useImportExcel.tsx`)

O campo `Contrato` da planilha (coluna texto livre) continuará funcionando para inserir o **nome do contrato como texto** na coluna `contrato` (legacy), sem quebrar o fluxo atual. A vinculação por `contrato_id` fica disponível somente via UI.

---

### Arquivos afetados

| Arquivo | Operação |
|---|---|
| Migration SQL | **CRIAR** tabela `contratos` + coluna `contrato_id` em `veiculos` |
| `src/hooks/useContratos.tsx` | **CRIAR** hook completo |
| `src/types/fleet.ts` | Adicionar interface `Contrato` |
| `src/pages/Empresas.tsx` | Expandir com sublistagem de contratos e dialog de contrato |
| `src/pages/VeiculoDetalhe.tsx` | Substituir campo texto de contrato por Select de contratos |
| `src/hooks/useFleetData.tsx` | Atualizar `useVeiculoDetalhe` para incluir `contrato` relacionado |

### Nenhuma quebra de dados existentes

- O campo texto `contrato` na tabela `veiculos` permanece (compatibilidade com importações)
- A nova coluna `contrato_id` é nullable — veículos sem vínculo formal não são afetados
- Contratos com CASCADE DELETE: ao excluir empresa, seus contratos também são removidos; veículos têm `SET NULL` no `contrato_id`
