
## Adicionar "Atualizar Tag da Obra" na Tela de Detalhamento do Veículo

### Objetivo
Adicionar um botão e fluxo de edição para o campo **Tag da Obra** na tela de detalhamento do veículo (`/veiculos/:id`), semelhante ao fluxo já existente de "Atualizar KM/Horímetro".

### Situação Atual
Na página `src/pages/VeiculoDetalhe.tsx`:
- Existe um botão "Atualizar KM/Horímetro" que abre campos de edição inline para `km_atual` e `hora_atual`
- O campo `tag_obra` é exibido apenas no cabeçalho da página (abaixo da placa), de forma somente leitura
- A função `useUpdateVeiculo` já suporta atualizar qualquer campo do veículo no banco de dados

### O que será feito

**1. Adicionar estado de edição para Tag da Obra**

Novos estados no componente:
- `tagObraEdit` — valor atual sendo editado
- `isEditingTagObra` — controla se o campo está em modo de edição

**2. Adicionar funções de controle**
- `handleStartEditTagObra` — inicializa a edição com o valor atual
- `handleCancelEditTagObra` — cancela e restaura o estado original
- `handleSaveTagObra` — salva via `updateVeiculo.mutateAsync({ id, tag_obra: tagObraEdit })` e exibe toast de sucesso/erro

**3. Atualizar a exibição do campo Tag da Obra**

O campo `tag_obra` aparece no cabeçalho da página. Será adicionada uma seção dedicada dentro do card "Informações do Veículo", com:
- Rótulo com ícone (ex: `Tag` da biblioteca lucide-react)
- Valor exibido em modo leitura (ou "Não definida" se vazio)
- Modo de edição com `Input` de texto

**4. Adicionar botão "Atualizar Tag da Obra"**

Na área de botões do card (onde já existe "Atualizar KM/Horímetro"), será adicionado um segundo botão independente:

```
[ ↺ Atualizar KM/Horímetro ]  [ 🏷 Atualizar Tag da Obra ]
```

Cada botão terá seu próprio fluxo de edição independente — ao clicar em um, o outro continua em modo de exibição.

### Arquivos a modificar

- `src/pages/VeiculoDetalhe.tsx` — único arquivo a ser alterado:
  - Adicionar novos estados
  - Adicionar novas funções de edição/salvamento
  - Adicionar campo Tag da Obra no grid de informações do veículo
  - Adicionar botão "Atualizar Tag da Obra" na barra de ações

### Banco de Dados
Nenhuma migração necessária — a coluna `tag_obra` já existe na tabela `veiculos` e o hook `useUpdateVeiculo` já aceita esse campo (basta passar como parâmetro no objeto de atualização, que está tipado como `Record<string, any>`).

### Fluxo do Usuário
1. Usuário acessa a tela de detalhamento de um veículo
2. Vê as informações do veículo, incluindo "Tag da Obra" (ex: "Obra Centro" ou "Não definida")
3. Clica em "Atualizar Tag da Obra"
4. O campo vira um `Input` de texto editável
5. Usuário digita o novo valor e clica em "Salvar Alterações"
6. O sistema salva no banco de dados e exibe mensagem de sucesso
7. A tela volta ao modo de exibição com o novo valor
