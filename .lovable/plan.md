## O que precisa ser ajustado

O código do app **não** depende do nome antigo do subdomínio — todos os links de convite, redirects de email e login social usam `window.location.origin`, então se adaptam sozinhos ao novo `aurisquest.lovable.app`.

O que **precisa de configuração** está no backend (Lovable Cloud → Auth):

### 1. Atualizar Site URL e Redirect URLs (Auth)

A Site URL atual provavelmente é o subdomínio antigo (`jornada-kids.lovable.app`). Isso afeta:
- Link no email de confirmação de cadastro
- Link no email de recuperação de senha
- Callback do login com Google (se ativado)

Vou atualizar via `configure_auth` para:
- **Site URL:** `https://aurisquest.lovable.app`
- **Redirect allowlist:** incluir
  - `https://aurisquest.lovable.app/**`
  - `https://id-preview--1dc5c107-a8a8-4d5e-995e-56ab718eb7b6.lovable.app/**` (preview do editor)
  - `http://localhost:*/**` (dev local)
  - Quando `aurisquest.com` estiver pronto amanhã, eu acrescento `https://aurisquest.com/**` e `https://www.aurisquest.com/**`.

### 2. Google OAuth (se estiver ativo)

Se você tem login com Google ativado, no console do Google Cloud o **Authorized redirect URI** precisa incluir o callback do Supabase — esse não muda com a troca de subdomínio (continua sendo `https://rydwbkvkokwqpcpfwvcy.supabase.co/auth/v1/callback`), então **nada a fazer aqui**.

### 3. Domínio de email (`aurisquest.com`) — amanhã

Quando o domínio estiver disponível:
- Adicionar via "Set up email domain" (gera registros DNS: SPF, DKIM, DMARC)
- Você adiciona os registros em **Project Settings → Domains → ⋯ Configure → Manage DNS records** (já que comprou pela Lovable)
- Após verificado, eu rodo `setup_email_infra` e crio a edge function `send-responsible-invite` que envia o convite por email automaticamente (mantendo o link copiável como fallback).

### 4. Conectar `aurisquest.com` ao app — amanhã

No mesmo painel **Project Settings → Domains**, conectar `aurisquest.com` e `www.aurisquest.com` ao projeto e definir um como Primary. SSL é provisionado automaticamente.

### 5. Nada a mudar no código

Confirmei com busca: não há referência a `jornada-kids` em nenhum arquivo (`src/`, `supabase/`, `index.html`). Os títulos e meta tags já foram trocados para "Auris Quest" na rodada anterior.

## Resumo do que faço agora

1. Atualizar Site URL + Redirect allowlist no Auth para `aurisquest.lovable.app` (+ preview + localhost).

## O que fica para amanhã

- Adicionar domínio de email `aurisquest.com` + DNS
- Conectar `aurisquest.com` como custom domain do app
- Acrescentar `aurisquest.com` na Redirect allowlist
- Implementar envio de convite por email