## SideQuest do Dia — Plano de Implementação

### 1. Banco de Dados (migration)

Nova tabela `side_quests`:
- `id` (uuid pk), `family_id`, `child_id`, `created_by` (parent user)
- `category` (enum: bondade, criatividade, socializacao)
- `title` (texto fixo da missão sugerida)
- `mission_key` (slug para impedir repetição: ex. `bondade.ajudar`)
- `reward_auris` (int, 2 ou 3)
- `parent_comment` (text, opcional, max 80)
- `status` (pendente | concluida | expirada)
- `created_at`, `expires_at` (created_at + 24h), `completed_at`
- Índices: (child_id, status), (child_id, mission_key) onde status='concluida'
- RLS: responsáveis da família veem/criam; criança (via app) vê as próprias

Regra: máximo 1 SideQuest com status='pendente' e expires_at > now() por child_id por dia (validado em código + índice parcial único).

### 2. Catálogo de missões (frontend, `src/lib/sideQuests.ts`)

Constantes com 3 categorias × 3 missões cada (exatamente os textos do brief), com `mission_key`, `title`, `icon` (lucide ou emoji), `cor temática`. Categorias: Bondade (rosa/vermelho, Heart), Criatividade (amarelo/roxo, Lightbulb), Socialização (azul/verde, MessageCircle).

Função `pickRandomCategory()` — sorteio determinístico do dia opcional.

### 3. Responsável — Card de convite + Modal de criação

- **`src/components/sidequest/SideQuestInviteCard.tsx`**: card pergaminho compacto no Dashboard do responsável (acima de "Saldos por criança"). Mostra apenas se há ao menos uma criança sem SideQuest ativa hoje. Botão "Criar SideQuest do Dia".
- **`src/components/sidequest/CreateSideQuestDialog.tsx`**: modal com:
  1. Seletor de criança (se >1)
  2. Categoria sorteada (ícone grande + nome + cor) — botão "Sortear outra"
  3. 3 missões sugeridas como cards selecionáveis
  4. Recompensa automática (2 ou 3 Auris, aleatório)
  5. Textarea opcional (80 chars) com placeholder
  6. Botão "Confirmar missão" → insert na tabela com expires_at = now()+24h

### 4. Criança — Pergaminho no topo

- **`src/components/sidequest/SideQuestScroll.tsx`**: o pergaminho horizontal grande (estilo do mockup). Gradiente âmbar/dourado, bordas arredondadas, "carretéis" laterais simples em CSS, badge da categoria à esquerda, título central, timer regressivo à direita (atualiza a cada 1s via `setInterval`), comentário do responsável abaixo, botão "Marcar como concluída".
- Integrar em `src/pages/ChildHome.tsx` entre o card de nível/XP e os cards de totais (pendente/aprovado/pago). Hook `useActiveSideQuest(childId)` faz query + realtime.
- Ao concluir: update status='concluida', completed_at=now(); credita Auris via insert em `submissions` com tipo especial OU adiciona coluna `side_quest_id` em submissions. **Decisão:** criar submission `aprovado` com `reward_auris` e flag — mais simples: criar tabela própria de créditos não. Melhor: somar direto no saldo via `side_quests` aprovadas (atualizar query de saldo).

  **Abordagem mais simples e isolada**: criar uma `activity` virtual "SideQuest" oculta de listagens (`active=false, hidden=true`) e gerar `submission` aprovada. Porém menos limpo. **Escolha**: incluir `side_quests` concluídas no cálculo de saldo do dashboard e child home — atualizar `Dashboard.tsx` e ChildHome para somar `reward_auris` das side_quests concluídas. SideQuests NÃO entram em "Missões ativas" nem em submissions.

### 5. Histórico "Minhas Side-Quests"

- **`src/components/sidequest/SideQuestHistory.tsx`**: card com lista das últimas 5 concluídas (ícone, nome, categoria · data, Auris, check verde). Botão "Ver todas".
- Renderizar em `ChildHome.tsx` ao lado/abaixo de "Minhas medalhas" (na mesma região, sem remover nada existente).

### 6. Expiração

- Filtros nas queries usam `status='pendente' AND expires_at > now()` — expiração implícita, sem cron. Para histórico só mostramos `status='concluida'`.

### 7. Saldo de Auris

Atualizar pontos de leitura de saldo da criança (ChildHome e Dashboard responsável "Saldos por criança") para somar `SUM(reward_auris)` de `side_quests` onde `status='concluida'` da criança. Pagamentos continuam descontando normalmente.

### Arquivos a criar/editar

**Migration**: tabela `side_quests` + RLS + índice único parcial.

**Criar**:
- `src/lib/sideQuests.ts` (catálogo)
- `src/hooks/useActiveSideQuest.ts`
- `src/hooks/useSideQuestHistory.ts`
- `src/components/sidequest/SideQuestScroll.tsx`
- `src/components/sidequest/SideQuestInviteCard.tsx`
- `src/components/sidequest/CreateSideQuestDialog.tsx`
- `src/components/sidequest/SideQuestHistory.tsx`

**Editar**:
- `src/pages/ChildHome.tsx` — inserir pergaminho no topo + histórico; somar Auris de side_quests no saldo
- `src/pages/app/Dashboard.tsx` — inserir InviteCard; somar Auris de side_quests em earnedTotals/balances

### Garantias de não-regressão

- Não tocar em `Activities`, `Calendar`, `Ranking`, barra inferior.
- SideQuests ficam isoladas em tabela própria — não aparecem em "Missões ativas" (que lê de `activities`/`submissions`).
- Não geram medalhas.

Aprove para eu executar a migration e implementar.