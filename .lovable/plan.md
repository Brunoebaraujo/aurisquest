## Problema

A escolha de perfil ("parent") fica salva em `sessionStorage` (`aq_active_profile`) e persiste enquanto a aba do navegador continua aberta. Ao sair e entrar de novo pela tela `/auth`, o `AppLayout` lê esse valor antigo e pula direto para o painel do Responsável, sem passar por "Quem entrará?".

## Correção

Forçar que **todo novo login** comece sempre pelo seletor "Quem entrará?", limpando o perfil ativo nos momentos certos.

### Alterações

1. **`src/pages/Auth.tsx`**
   - Chamar `setActiveProfileDirect(null)` imediatamente antes de `signInWithPassword` (login) e antes de `signUp` (criar conta), garantindo que qualquer perfil ativo residual seja descartado antes da sessão nova.

2. **`src/contexts/AuthContext.tsx`** (verificar/ajustar)
   - No handler de `signOut` (ou no listener `onAuthStateChange` quando `event === "SIGNED_OUT"`), também chamar `setActiveProfileDirect(null)`. Isso cobre o caso de logout explícito e mantém o estado consistente.

### Resultado esperado
- Após qualquer login bem-sucedido, `AppLayout` vê `active === null` → redireciona para `/app/quem-entra`.
- O fluxo de link individual da criança (`/c/...`) continua intacto, pois não passa pelo `AppLayout` nem pelo seletor.