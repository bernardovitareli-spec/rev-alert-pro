## Contexto importante sobre o ambiente Lovable

Antes do plano, dois pontos do prompt **não se aplicam ao Lovable** e precisam ser ajustados:

1. **`.env` no Lovable** — o arquivo `.env` deste projeto é **gerado automaticamente** pelo Lovable Cloud (contém `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`). Ele **nunca vai para o GitHub** quando você conectar o repositório — o Lovable já o trata como ambiente local. Além disso, as chaves contidas nele são **publishable/anon keys**, projetadas para ficar expostas no client (a segurança real está nas RLS policies, que já estão ativas). Mesmo assim, adicionar ao `.gitignore` e criar um `.env.example` é boa prática e **vou fazer**.

2. **`git rm --cached .env`** — não posso executar comandos `git` no sandbox do Lovable (o estado do git é gerenciado internamente). Quando você conectar ao GitHub, o `.env` **não será commitado** porque estará no `.gitignore`. Se o repo já estiver conectado e o `.env` já tiver sido enviado antes, você precisará rodar `git rm --cached .env && git commit` **localmente no clone do GitHub** — eu posso te passar os comandos exatos, mas não consigo executá-los daqui.

3. **`supabase/types.ts`** — este arquivo é **regenerado automaticamente pelo Lovable** a cada migração do banco. **Não devo editá-lo manualmente** (e a doc do Lovable proíbe explicitamente). Olhando o arquivo atual (já em contexto), os campos `art_url`, `art_validade` e `contrato_id` **já estão presentes** na tabela `veiculos`. Portanto a "defasagem" não existe mais — os `@ts-ignore` e `(x as any)` em `VeiculoDetalhe.tsx` são resquícios antigos e podem ser removidos com segurança.

---

## Plano

### 1. Atualizar `.gitignore`
Adicionar as entradas de ambiente:
```
.env
.env.local
.env.*.local
```

### 2. Criar `.env.example`
Espelhar as chaves reais do `.env` com placeholders:
```
VITE_SUPABASE_PROJECT_ID="YOUR_SUPABASE_PROJECT_ID_HERE"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_PUBLISHABLE_KEY_HERE"
VITE_SUPABASE_URL="YOUR_SUPABASE_URL_HERE"
```

### 3. Limpar `src/pages/VeiculoDetalhe.tsx`
Remover os workarounds de tipagem nas 4 ocorrências identificadas:

- **Linha 130-131**: remover comentário `@ts-ignore` e o cast `(veiculo as any).contrato_id` → usar `veiculo.contrato_id` diretamente.
- **Linha 479**: `(veiculo as any).contrato_id` → `veiculo.contrato_id`.
- **Linha 712**: `(veiculo as any).art_url` → `veiculo.art_url`.
- **Linha 719**: `(veiculo as any).art_validade` → `veiculo.art_validade`.

### 4. Não alterar
- `.env` (gerenciado pelo Lovable)
- `src/integrations/supabase/types.ts` (já está atualizado e é auto-gerado)
- `src/integrations/supabase/client.ts` (auto-gerado)

### 5. Validação
- Build automático do Lovable deve passar sem erros de TS após remoção dos casts.

---

## O que você precisa fazer manualmente (fora do Lovable)

Se já conectou o projeto ao GitHub **antes** desta correção e o `.env` foi enviado, rode no clone local:
```bash
git rm --cached .env
git commit -m "chore: untrack .env"
git push
```
Como as chaves do `.env` deste projeto são **publishable keys** (não secretas), não há necessidade urgente de rotação — mas você pode rotacioná-las em Cloud Settings se quiser.

Confirma para eu prosseguir com as 3 mudanças (gitignore + .env.example + limpeza do VeiculoDetalhe.tsx)?