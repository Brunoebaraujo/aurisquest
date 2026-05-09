# Isolamento de famílias e convite de responsáveis

## Objetivo
1. Isolar o ambiente de login das crianças por família (cada família com link próprio).
2. Permitir que um responsável convide outro responsável para a mesma família.

---

## 1) Login infantil isolado por família

### Banco
- Adicionar à tabela `families`:
  - `slug` text único (gerado a partir do nome + sufixo curto aleatório)
  - `kid_access_token` text único (token aleatório seguro, fallback caso o slug colida)
- Backfill automático para famílias existentes.
- Trigger `BEFORE INSERT` que gera `slug` e `kid_access_token` quando nulos.

### Função RPC
- Substituir `list_active_children_public()` (atual: lista crianças de TODAS as famílias) por:
  - `list_children_by_family_token(_token text)` → retorna apenas crianças ativas da família correspondente ao `slug` ou `kid_access_token`. Retorna também `{ family_id, family_name }`.
- Manter `list_active_children_public` removida ou trocada por versão segura — ela é o vazamento principal hoje.

### Edge function `child-login`
- Aceitar opcionalmente `family_token` e validar que `child.family_id` corresponde à família do token, evitando login cruzado mesmo se alguém adivinhar `child_id`.

### Frontend
- Nova rota: `/familia/:familyToken/entrar` → componente `ChildLoginFamily` (reaproveitando a UI atual).
- Rota antiga `/entrar`: passa a mostrar uma tela explicativa ("peça o link à sua família") em vez de listar todas as crianças.
- Botão "Copiar link das crianças" em:
  - `Admin → Famílias` (coluna nova com link `/familia/{slug}/entrar`)
  - Nova seção em `Children` (tela do responsável) com card "Link de acesso das crianças desta família".

---

## 2) Convite de outro responsável

### Banco
- Reutilizar `invitations` adicionando coluna `kind text NOT NULL DEFAULT 'family_onboarding'` com valores: `family_onboarding` | `family_responsible`.
- Atualizar `accept_invitation(_token)`:
  - Se `kind = 'family_responsible'`, NÃO trocar `primary_parent_id`, apenas vincular `profiles.family_id` e dar role `parent`. Família já está ativa.
- Nova função `create_responsible_invitation(_name text, _email text)`:
  - Verifica que o usuário tem `family_id`.
  - Cria invitation com `family_id` do usuário, `kind='family_responsible'`, token aleatório, expira em 7 dias.
  - Retorna o token para o frontend montar a URL.
- RLS de `invitations`: permitir SELECT/INSERT pelo responsável da própria família para `kind='family_responsible'` (admin continua vendo tudo).

### Frontend
- Nova rota `/app/responsaveis` → tela `Responsibles.tsx`:
  - Lista profiles com `family_id = minha família` (nome, email, "principal" badge se `families.primary_parent_id`).
  - Lista invitations pendentes/aceitos da família com `kind='family_responsible'`.
  - Botão "Convidar responsável" (nome + email) → chama RPC, mostra link copiável `/convite/{token}`.
- Item "Responsáveis" no `AppSidebar` (visível para usuários com família).
- `InviteAccept` já existe e chama `accept_invitation` — funcionará automaticamente porque a função aceitará ambos os `kind`.

---

## 3) Segurança e RLS — revisão
- Tabela `children` já filtra por `family_id = get_user_family_id(auth.uid())` ✅
- A brecha real é a função `list_active_children_public`. Será **substituída** pela versão tokenizada.
- `child-login` ganhará validação de família para fechar a porta lateral.

---

## Detalhes técnicos

```sql
ALTER TABLE families
  ADD COLUMN slug text UNIQUE,
  ADD COLUMN kid_access_token text UNIQUE;

-- backfill: slug = lower(unaccent(name)) + '-' + 6 hex; kid_access_token = encode(gen_random_bytes(18),'base64')
```

```sql
CREATE FUNCTION list_children_by_family_token(_token text)
RETURNS TABLE(family_id uuid, family_name text, child_id uuid, name text, avatar_url text, has_password boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT f.id, f.name, c.id, c.name, c.avatar_url, (c.password_hash IS NOT NULL)
  FROM families f
  JOIN children c ON c.family_id = f.id AND c.active
  WHERE f.slug = _token OR f.kid_access_token = _token
  ORDER BY c.name;
$$;
```

```sql
ALTER TABLE invitations ADD COLUMN kind text NOT NULL DEFAULT 'family_onboarding';
-- nova policy: responsável da família vê/cria invites kind='family_responsible' da sua família
```

### Arquivos a criar/editar
- `supabase/migrations/<novo>.sql` — colunas, backfill, trigger, novas funções, RLS.
- `src/integrations/supabase/types.ts` — auto.
- `src/pages/ChildLoginFamily.tsx` — nova (reaproveita UI de `ChildLogin`).
- `src/pages/ChildLogin.tsx` — convertida em tela informativa.
- `src/pages/app/Responsibles.tsx` — nova.
- `src/pages/app/Children.tsx` — adicionar card com link das crianças.
- `src/pages/app/AdminFamilies.tsx` — coluna "Link das crianças" + botão copiar.
- `src/components/AppSidebar.tsx` — item "Responsáveis".
- `src/App.tsx` — novas rotas.
- `supabase/functions/child-login/index.ts` — validação de família.

### Compatibilidade
- A rota antiga `/entrar` continua existindo (sem listar crianças). Links antigos `/enviar/:childId` continuam redirecionando.
- Famílias existentes recebem slug/token via backfill antes do trigger entrar.
