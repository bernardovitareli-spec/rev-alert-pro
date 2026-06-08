# Plano: Papel "Apontador"

Adiciona um terceiro papel restrito ao sistema. O Apontador só consegue atualizar 4 campos de veículos (KM, Horímetro, Última Atualização, Retorno ao Pátio). Tudo o mais fica bloqueado por RLS, trigger no banco, rotas e UI.

## 1. Banco (migração única)

- `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'apontador'` (precisa de COMMIT antes de ser usado em policies — fazer em migração separada da que cria policies, ou usar dois migrations sequenciais).
- Função `public.is_apontador()` security definer (espelha `is_admin()`).
- Trigger `BEFORE UPDATE` em `veiculos`: se `is_apontador()` é true, comparar `OLD` vs `NEW` em todas as colunas; se qualquer coluna fora de `{km_atual, hora_atual, ultima_atualizacao, retorno_patio}` mudou → `RAISE EXCEPTION 'Apontador só pode atualizar Km/Hr e Retorno ao Pátio'`.
- Policy adicional em `veiculos`: `FOR UPDATE TO authenticated USING (is_apontador()) WITH CHECK (is_apontador())`. As policies de admin/user existentes continuam.
- INSERT/DELETE em `veiculos` e todas as demais tabelas (`empresas`, `tipos_revisao`, `oficinas`, `revisoes`, `ordens_servico`, `avarias_fotos`, `historico_revisoes`, `import_logs`) ficam como estão (admin-only). O trigger já blinda alterações via apontador.
- Trigger `handle_new_user` permanece inserindo `'user'` — papel `apontador` é atribuído pelo Admin via edge function.

## 2. Hook `useUserRole`

`src/hooks/useUserRole.tsx`: query única que lê `user_roles` do user atual, retorna `{ role, isAdmin, isApontador, isLoading }`. Prioridade: admin > apontador > user. `useIsAdmin` vira alias.

## 3. Cadastro com papel (AdminUsuarios + edge function)

- Form de cadastro ganha `<select>` nativo "Papel" (Admin / Apontador) — obrigatório.
- Edge `admin-invite-user` aceita `role: 'admin' | 'apontador'`, e após `createUser` faz `INSERT INTO user_roles (user_id, role)` com o papel escolhido (deduplicando o `'user'` criado pelo trigger se necessário — substituir/adicionar).
- Tabela "Usuários cadastrados" passa a listar a coluna **Papel** (badge vermelho=Admin, azul=Apontador, cinza=User) e botão **Alterar Papel** abrindo um dialog com `<select>` nativo. Salvar = `delete` dos papéis antigos e `insert` do novo (mantendo segurança).

## 4. AppSidebar

Se `isApontador` → renderizar apenas item "Veículos" + footer (Sair). Admin e user legado: comportamento atual.

## 5. App.tsx — redirecionamento por papel

- Novo wrapper `RoleGate` em rotas. Se `isApontador` e path ≠ `/veiculos` e ≠ `/veiculos/:id` e ≠ `/perfil` → `Navigate to="/veiculos"` + `toast.error("Acesso restrito ao seu perfil")`.
- Após login, se `isApontador`, redirecionar `/` → `/veiculos`.

## 6. Página Veículos para Apontador

Em `VehiclesList` e `VeiculoDetalhe`, detectar `isApontador`:

- Esconder botões Novo/Editar/Excluir, esconder Revisões, Documentos, Histórico.
- Renderizar um componente novo `ApontadorVehicleList` (lista enxuta de veículos com placa/tag/empresa) e `ApontadorUpdateForm` com 4 inputs nativos:
  - KM Atual (number)
  - Horímetro Atual (number)
  - Última Atualização (date, default hoje)
  - Retorno ao Pátio (date, opcional)
- Busca por placa/tag no topo.
- Salvar = `update veiculos set ... where id = ?`, toast "Atualização salva".

## 7. Página `/perfil`

Nova `src/pages/MeuPerfil.tsx` acessível por todos os papéis:
- Nome, email, papel (badge), descrição do papel, botão "Alterar senha" (reusa `ForgotPasswordDialog`/`resetPasswordForEmail`), botão "Sair".
- Link "Meu Perfil" no footer da sidebar (todos os papéis).

## 8. README

Adicionar a matriz de permissões fornecida pelo usuário.

## Detalhes técnicos

- Enum + uso em policy no mesmo transaction quebra (Postgres exige commit do novo enum value antes de ser referenciado). Solução: **duas migrações** consecutivas — (a) só `ALTER TYPE`; (b) função/trigger/policy.
- Trigger usa `to_jsonb(OLD) - 'km_atual' - 'hora_atual' - 'ultima_atualizacao' - 'retorno_patio'` vs idem em `NEW` para detectar mudanças fora do permitido — robusto e independente de adicionar novas colunas no futuro.
- Edge function: após `createUser`, faz `upsert` em `user_roles` com o role escolhido. Se `admin`, remove o `'user'` redundante para a UI listar corretamente.
- Selects e date pickers nos modais usam HTML nativo (regra do projeto).
- Sem alteração em `client.ts`, `types.ts`, `.env`, `config.toml`.

## Arquivos

Novos:
- `src/hooks/useUserRole.tsx`
- `src/components/vehicles/ApontadorVehicleList.tsx`
- `src/pages/MeuPerfil.tsx`
- Migrações em `supabase/migrations/`

Editados:
- `src/hooks/useIsAdmin.tsx` (alias)
- `src/pages/AdminUsuarios.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/pages/Veiculos.tsx` / `src/components/vehicles/VehiclesList.tsx` / `src/pages/VeiculoDetalhe.tsx`
- `src/App.tsx`
- `supabase/functions/admin-invite-user/index.ts`
- `README.md`

Confirma para eu seguir?
