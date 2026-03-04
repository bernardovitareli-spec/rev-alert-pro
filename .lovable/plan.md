

## Adicionar Documento ART ao Controle de Veículos

### O que será feito

Adicionar um novo tipo de documento chamado **ART** (Anotação de Responsabilidade Técnica) na seção "Documentos do Veículo", com:
- Upload/anexo do documento ART
- Controle de validade com indicador de status (vencido, atenção, ok)
- Mesma experiência visual dos documentos CRLV e Tacógrafo

### Alterações necessárias

#### 1. Banco de dados -- Migração SQL
Adicionar duas novas colunas na tabela `veiculos`:
- `art_url` (text, nullable) -- para armazenar o link do documento anexado
- `art_validade` (date, nullable) -- para controlar a validade do ART

#### 2. `src/types/fleet.ts` -- Tipo do documento
Incluir `'art'` no tipo `TipoDocumentoVeiculo`:
```
'crlv' | 'tacografo' | 'documento' | 'art'
```

Incluir `art_url`, `art_validade` na interface `Veiculo`.

#### 3. `src/pages/VeiculoDetalhe.tsx` -- Lógica e UI

- **handleDocumentoChange**: Adicionar mapeamento `art` -> `art_url`
- **handleValidadeChange**: Adicionar mapeamento `art` -> `art_validade`
- **UI**: Novo card ART na grid de documentos com ícone, upload e controle de validade (mesmo padrão do CRLV e Tacógrafo)

### Sem impacto em outras funcionalidades

Apenas adiciona um novo documento opcional. Nenhuma funcionalidade existente será alterada.
