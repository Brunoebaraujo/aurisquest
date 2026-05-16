## Problema 1 — Avatares e itens não aparecem visualmente

As crianças têm itens desbloqueados no banco, mas **nenhuma tem nada equipado**, então o componente `EquippedAvatar` mostra apenas a inicial do nome (fallback). Os ícones de elmo, armadura, arma, pet e aura só aparecem quando há algo no slot.

### Solução: auto-equipar starters

**Migração SQL** (`evaluate_cosmetic_unlocks`) — depois de inserir desbloqueios, se a criança ainda não tem nada no slot, equipar automaticamente:

- `avatar_id` ← primeiro avatar `starter` (categoria humano) por `sort_order` se for `NULL`
- `helmet_item_id`, `armor_item_id`, `weapon_item_id`, `pet_item_id`, `aura_item_id` ← primeiro item `starter` da respectiva categoria por `sort_order` se for `NULL`

A regra `if NULL` garante que **nunca sobrescreve** uma escolha que a criança/responsável já fez no Guarda-roupa.

**Backfill imediato**: rodar `SELECT evaluate_cosmetic_unlocks(id) FROM children;` ao final da migração para que Maya, Gael e Theo apareçam equipados já no próximo refresh.

Resultado esperado em `/app/criancas` e `/app`: cada card de criança passa a mostrar o avatar starter com elmo, armadura, arma, pet e aura visíveis. A criança continua livre para trocar tudo pelo Guarda-roupa.

---

## Problema 2 — Recuperação de senha

Hoje a tela `/entrar` (`src/pages/Auth.tsx`) só tem Entrar/Cadastrar — sem link de "Esqueci minha senha". Se você sair, não há caminho de volta.

### Solução: adicionar fluxo padrão de reset

1. **Em `src/pages/Auth.tsx`**: adicionar link "Esqueci minha senha" abaixo do botão Entrar, abrindo um diálogo que pede e-mail e chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.

2. **Nova página `src/pages/ResetPassword.tsx`** (rota pública `/reset-password`):
   - Detecta `type=recovery` no hash da URL.
   - Mostra dois campos (nova senha + confirmar).
   - Chama `supabase.auth.updateUser({ password })`.
   - Redireciona para `/app` após sucesso.

3. **Em `src/App.tsx`**: registrar a rota `/reset-password` antes das rotas protegidas.

### Para você agora (sem precisar sair)

Você **já está logado** como `brunoebaraujo@gmail.com`. Assim que a alteração subir, você pode:
- Ir em `/entrar` → "Esqueci minha senha" → enviar reset para o próprio e-mail
- **Ou** simplesmente trocar a senha enquanto está logado via console (eu posso adicionar um botão "Trocar minha senha" no header do `/app` se preferir — diga e incluo no plano).

---

## Arquivos afetados

**Banco**
- nova migração: atualizar função `evaluate_cosmetic_unlocks` + backfill

**Frontend**
- `src/pages/Auth.tsx` — link + diálogo de reset
- `src/pages/ResetPassword.tsx` — nova página
- `src/App.tsx` — registrar rota

Nenhuma alteração nas tabelas, RLS ou edge functions.
