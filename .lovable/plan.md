# Fase final — Chest, Especial e Eventos sazonais

Escopo enxuto reaproveitando o que já existe (admin, RPCs de unlock, RewardRevealModal).

## 1. Banco de dados (1 migração)

- Estender o enum `cosmetic_category` com `'chest'` e `'especial'`.
- Em `cosmetic_items`, adicionar coluna `chest_reveals_item_id uuid` (nullable) — referência ao item real que o baú entrega quando aberto.
- Sem nova tabela. `starts_at` / `ends_at` / `scope_*` já existem e cobrem temporadas.
- Atualizar `evaluate_cosmetic_unlocks`: quando o item desbloqueado for um `chest` com `chest_reveals_item_id` preenchido, inserir também o item-alvo em `child_unlocked_items` (idempotente, mesma janela de avaliação).
- `get_child_new_unlocks` já cobre — qualquer linha nova em `child_unlocked_items` vira reveal.

## 2. Admin > Recompensas (AdminRewards.tsx)

- Adicionar `chest` e `especial` em `KINDS` (label "Baú" e "Especial / Evento").
- Quando `kind === "chest"`: mostrar campo extra "Item revelado ao abrir" (select dos `cosmetic_items` ativos que NÃO sejam chest).
- Filtro de tipo ganha as duas novas opções.
- `starts_at`/`ends_at` já existem no form — adicionar dica visual "Use para eventos sazonais" quando `kind === "especial"` ou quando datas preenchidas (badge "Sazonal" no card).
- Badge visual diferenciada no card para `especial` (borda dourada/gradiente) e `chest` (ícone de baú).

## 3. Animação (RewardRevealModal)

- Reusar o cristal atual. Sem novo componente.
- Quando o item desbloqueado for `chest`, exibir 2 reveals em sequência:
  1. Cristal → revela o baú (com label "Você ganhou um baú!")
  2. Cristal → revela o item interno (label "O baú continha…")
- Detecção: o backend já vai inserir as duas linhas; o modal só precisa enfileirar normalmente. Adicionar pequena variação de cor/label baseado em `category === 'chest' | 'especial'`.

## 4. Inventário (ChildInventoryDialog)

- Adicionar `chest` e `especial` ao seletor de tipo (pills).
- Item `especial` ganha selo "Evento" quando `starts_at`/`ends_at` estão na janela atual.

## Fora do escopo

- Pool aleatório de itens no baú (decidido: item único pré-definido).
- Painel separado de "Eventos/Temporadas" (datas já vivem dentro do form de recompensa — sem nova tela).
- Notificações de "evento acabando".

## Aviso de orçamento

Com 5 créditos, este escopo é factível mas justo. Se aparecerem iterações de polish ou bugs de migration, pode ultrapassar. Se quiser folga, sugiro cortar item 4 (inventário) desta entrega.
