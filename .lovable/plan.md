# Plano: E-mails do Auris Quest

## Configurações confirmadas
- **Remetente padrão**: `Auris Quest <noreply@aurisquest.com>`
- **Reply-To**: `support@aurisquest.com`
- **Tom**: acolhedor, animado e lúdico (linguagem fantasy/cartoon do app)
- **Logo**: usar o ícone Auri atual (`src/assets/auri.svg`)

## Etapa 1 — Configurar domínio de envio
Hoje o projeto **não tem domínio de e-mail configurado** no Lovable Cloud. Antes de qualquer envio automático precisamos ativar o domínio `aurisquest.com` (será delegado um subdomínio tipo `notify.aurisquest.com` para autenticar o envio com SPF/DKIM/MX). Isso é feito por um diálogo guiado — basta clicar no botão que vou apresentar e seguir as instruções de DNS no provedor do domínio.

Importante: você não precisa apontar as caixas reais (`noreply@`, `support@`, `invite@`) para o Lovable. Elas continuam no seu provedor de e-mail. O Lovable só precisa do subdomínio para *enviar* em nome de `noreply@aurisquest.com`.

## Etapa 2 — Infraestrutura de e-mail
Após o domínio ser aceito, ativo automaticamente a fila de envio, log de entregas, supressão de bounces e cron de processamento. Nenhuma ação sua.

## Etapa 3 — Templates de convite (dois)
Criar dois templates React Email com identidade Auris Quest (cores do app, Auri no topo, tipografia Fredoka/Nunito, tom lúdico):

1. **`family-invite`** — convite inicial de família nova (gerado em `Admin → Famílias`).
   - Assunto: "Sua família foi convidada para o Auris Quest! ✨"
   - Conteúdo: saudação ao responsável pelo nome, explica o que é o app, botão grande "Aceitar convite", validade de 7 dias.

2. **`responsible-invite`** — convite de responsável adicional (gerado em `Responsáveis`).
   - Assunto: "{nome do convidante} te convidou para cuidar da família no Auris Quest 💛"
   - Conteúdo: nome de quem convidou, nome da família, botão "Entrar na família".

Ambos:
- Logo Auri no topo (subido para storage público)
- Cores do tema (turquesa/coral/dourado)
- Footer com `support@aurisquest.com` para dúvidas
- Rodapé de unsubscribe é adicionado automaticamente pelo sistema

## Etapa 4 — Disparo automático
Hoje, ao criar família/convite em `AdminFamilies.tsx` e `Responsibles.tsx`, o link é apenas copiado para clipboard. Vou:

- Adicionar um campo **email** ao formulário (já existe `contact` — vou validar que seja e-mail válido para envio).
- Após gerar o convite, chamar `send-transactional-email` com o template correto, passando: nome do destinatário, nome da família, nome do convidante (quando aplicável) e URL do convite.
- Manter o botão "Copiar link" como fallback.
- Adicionar botão **"Reenviar e-mail"** ao lado de "Renovar/Copiar" na lista de convites pendentes.

## Etapa 5 — Página de unsubscribe
Criar rota `/unsubscribe` que valida o token e confirma a remoção, com visual do app.

## O que preciso de você agora
1. Clicar no botão abaixo para iniciar o cadastro do domínio (vou precisar que você adicione 2-4 registros DNS no provedor do `aurisquest.com`).
2. Confirmar no provedor de e-mail que `support@aurisquest.com` consegue receber respostas (já que será o Reply-To).

Depois que o DNS for verificado, os envios passam a sair automaticamente — você acompanha em **Cloud → Emails**.

## Fora de escopo
- E-mails de autenticação (signup/recuperação de senha) — hoje crianças usam código curto e responsáveis fazem login direto; se quiser personalizar mais tarde é uma etapa separada.
- Notificações periódicas (resumos semanais, lembretes) — seriam marketing/transacional recorrente, fora deste plano.
