## Objetivo

1. Corrigir o erro `function gen_random_bytes(integer) does not exist` ao convidar responsável.
2. Enviar o convite **por email** automaticamente, mantendo o **link copiável** como redundância.

## Causa do erro

A função `public.create_responsible_invitation` chama `gen_random_bytes(24)` sem schema. A extensão `pgcrypto` está instalada em `extensions`, e o `search_path` da função é só `public` — daí o "does not exist". A coluna `families.kid_access_token` já usa corretamente `extensions.gen_random_bytes(...)`.

## Plano

### 1. Migração SQL

Recriar `public.create_responsible_invitation` com:
- `extensions.gen_random_bytes(24)` qualificado, e
- `SET search_path = public, extensions`.

Nenhuma outra mudança de schema/RLS.

### 2. Configurar infraestrutura de email

Como o projeto ainda não tem domínio de email configurado, vou pedir o setup do domínio (diálogo "Set up email domain"). Após verificado, rodo `setup_email_infra` para criar fila/cron de envio.

### 3. Edge function `send-responsible-invite`

Nova function (verify_jwt = true) que:
- Recebe `{ name, contact }`
- Chama `create_responsible_invitation` via `supabase-js` com o JWT do usuário (respeitando RLS/auth)
- Recebe `{ id, token }`
- Enfileira email via `pgmq` com:
  - assunto: "Você foi convidado para a família {nome} no Jornada Kids"
  - corpo HTML com nome do convidado, nome de quem convidou, link `https://<app>/convite/{token}`, validade 7 dias
- Retorna `{ token, email_queued: true|false }`

Se o domínio de email ainda não estiver pronto, a função retorna `email_queued: false` (silenciosamente) — o link copiável continua funcionando como fallback.

### 4. Frontend `src/pages/app/Responsibles.tsx`

- Trocar a chamada direta `supabase.rpc("create_responsible_invitation", ...)` por `supabase.functions.invoke("send-responsible-invite", { body: { name, contact } })`.
- Toast: "Convite criado! Email enviado para {contact}." quando `email_queued`; senão "Convite criado — copie e envie o link manualmente."
- Manter o bloco com link copiável (já existe).
- Manter botão "Copiar link" em cada convite pendente da listagem.

### 5. Verificação

1. Convidar responsável → toast de sucesso, sem erro de `gen_random_bytes`.
2. Convite aparece na listagem com link copiável.
3. Email chega ao destinatário (após DNS verificado); enquanto isso, o link copiado funciona normalmente.

## Pergunta antes de começar

Você quer configurar agora um **domínio próprio para envio de email** (precisa adicionar registros DNS) ou prefere que eu **só corrija o bug** e mantenha o convite por link copiável até decidir o domínio?
