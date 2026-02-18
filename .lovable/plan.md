
## Atualizar Mapeamento de Colunas e Planilha Modelo de Importação

### O que foi identificado

Comparando o novo arquivo enviado com o código atual, há 3 correções de nomes de colunas e 1 coluna nova:

| # | Situação | Coluna Atual (incorreta) | Coluna Nova (correta) |
|---|---|---|---|
| 1 | Renomeada | `Tag Obra` | `Tag da Obra` |
| 2 | Renomeada | `Tipo de Revisao` | `Tipo de Revisão` |
| 3 | Renomeada/Separada | `Empresa de Contrato` | `Empresa` |
| 4 | Nova coluna | _(não existia)_ | `Contrato` |

### Banco de Dados

A coluna `contrato` ainda não existe na tabela `veiculos`. Será criada uma migration SQL:

```sql
ALTER TABLE public.veiculos ADD COLUMN contrato text NULL;
```

O tipo `ImportedRow` em `src/types/fleet.ts` também receberá o campo `contrato?: string`.

### Arquivos a Modificar

**1. `src/hooks/useImportExcel.tsx`**

Atualizar o `COLUMN_MAP` com os novos nomes exatos das colunas:

```
'Tag da Obra'      → tag_obra
'Tipo de Revisão'  → tipo_revisao
'Empresa'          → empresa
'Contrato'         → contrato   (novo)
```

Também será necessário tratar o campo `contrato` no processamento da linha (string simples, sem transformação especial).

**2. `src/components/import/ImportExcel.tsx`**

Atualizar dois pontos:

- `TEMPLATE_COLUMNS` — a lista de cabeçalhos usados para gerar o arquivo .xlsx ao clicar em "Baixar Planilha Modelo"
- `EXAMPLE_DATA` — os dados de exemplo embutidos no arquivo gerado

Os nomes das colunas passarão a ser exatamente os mesmos do arquivo enviado:
`Placa ou Serie`, `Tag da Obra`, `Última Atualização`, `KM Atual`, `Hora Atual`, `Retorno ao Pátio`, `Tipo de Revisão`, `Data da Revisão`, `KM da Revisão`, `Hora da Revisão`, `Intervalo`, `Revisão Por`, `Contrato`, `Empresa`

O exemplo de dados também incluirá a coluna `Contrato` com valores ilustrativos.

**3. `src/types/fleet.ts`**

Adicionar o campo `contrato?: string` na interface `ImportedRow`.

### Fluxo após a correção

1. O usuário clica em "Baixar Planilha Modelo"
2. O arquivo gerado terá exatamente os mesmos cabeçalhos do novo modelo enviado
3. Ao importar uma planilha com esses novos nomes, o sistema reconhecerá todas as colunas corretamente
4. O campo `Contrato` será salvo na tabela `veiculos` na coluna `contrato`
5. O campo `Empresa` (antes chamado `Empresa de Contrato`) continuará sendo vinculado ao `empresa_id`

### Nenhuma quebra de compatibilidade

- Planilhas antigas com `Tag Obra`, `Tipo de Revisao` e `Empresa de Contrato` deixarão de ser reconhecidas automaticamente — isso é esperado, pois o modelo foi corrigido.
- Dados já importados no banco não são afetados.
