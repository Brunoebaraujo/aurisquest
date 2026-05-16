
# Sistema de Avatares, Itens Cosméticos e Raridades

## Visão geral

Vamos transformar o perfil da criança em uma vitrine de progressão visual: avatar fixo (escolhido de uma biblioteca), level híbrido, slots de equipamento cosmético (elmo, armadura, arma, pet, aura, badge favorita) e raridades com cores/efeitos próprios. Tudo cartoon/fantasy, integrado a rankings, grupos e missões.

**Sem ginástica de gameplay**: itens são 100% cosméticos. Sem multiplicadores, sem bônus.

---

## 1. Banco de dados

Novas tabelas (migration única):

- `cosmetic_rarity` enum: `comum | raro | epico | lendario`
- `cosmetic_category` enum: `elmo | armadura | arma | pet | aura | moldura | badge`
- `avatar_category` enum: `humano | fantastico`
- `unlock_rule_type` enum: `auris_total | medalhas | streak | manual`

Tabelas:

- `avatars` — catálogo global (id, name, category, image_url, rarity, unlock_rule_type, unlock_threshold, sort_order, active)
- `cosmetic_items` — catálogo global (id, name, description, category, rarity, image_url, unlock_rule_type, unlock_threshold, sort_order, active)
- `child_unlocked_avatars` — (child_id, avatar_id, unlocked_at, source)
- `child_unlocked_items` — (child_id, item_id, unlocked_at, source)
- `child_equipment` — 1:1 com `children` (child_id PK, avatar_id, helmet_item_id, armor_item_id, weapon_item_id, pet_item_id, aura_item_id, frame_item_id, favorite_badge_id, updated_at)

Função `public.compute_child_level(_child_id)` — retorna `{ level, xp, xp_to_next, total_xp }` com fórmula híbrida:
- `total_xp = auris_aprovados * 1 + medalhas * 50 + maior_streak_ativa * 5`
- Curva: `level = floor(sqrt(total_xp / 25)) + 1` (cresce devagar)

Função `public.evaluate_cosmetic_unlocks(_child_id)` — varre `avatars` e `cosmetic_items` cujas regras `auris_total / medalhas / streak` foram atingidas e insere em `child_unlocked_*` (ON CONFLICT DO NOTHING). Devolve lista de novidades para tocar animação no app.

Trigger após `submissions` aprovadas e `mission_awards`: chama `evaluate_cosmetic_unlocks` para a criança.

`get_child_dashboard` é estendido para retornar: `avatar`, `equipment`, `level`, `unlocked_avatars`, `unlocked_items`, `newly_unlocked` (delta da última visita), `catalog` (apenas itens + raridade para "vitrine bloqueada").

RLS:
- Catálogos (`avatars`, `cosmetic_items`): leitura pública para autenticados; escrita só admin.
- `child_unlocked_*` e `child_equipment`: leitura pela família da criança (via `get_user_family_id`) e leitura pública limitada por token de criança (via `get_child_dashboard`). Equipar = update por respons. da família ou pela criança autenticada por token (via edge function).

Edge function `equip-cosmetic` — recebe token da criança + slot + item_id, valida que está desbloqueado e atualiza `child_equipment`.

---

## 2. Geração de arte (IA)

Set inicial, estilo único cartoon/fantasy, fundo transparente, paleta vibrante coerente com a marca (turquesa/coral/dourado).

**Avatares (~20)** salvos em `src/assets/avatars/`:
- Humanos (10): menina/menino × 5 etnias (clara, parda, negra, asiática, indígena), olhar amigável, busto.
- Fantásticos (10): dragão, unicórnio, mago, slime, robozinho, raposa mágica, cavaleiro, fada, lobo místico, fênix.

**Itens cosméticos (~30)** salvos em `src/assets/cosmetics/{category}/`:
- Elmos (6): chapéu de mago, capacete de cavaleiro, coroa, tiara floral, bandana, capuz de explorador
- Armaduras (6): peitoral de couro, manto estelar, jaqueta de aventureiro, túnica élfica, armadura de cristal, capa de herói
- Armas/ferramentas (6): cajado, espada, arco, pincel mágico, livro de feitiços, lanterna encantada
- Pets (6): filhote de dragão, gatinho, coruja, slime mini, tartaruga, vagalume
- Auras (3): brilho dourado, faíscas estelares, chamas azuis
- Molduras (3): madeira, prata, ouro

Distribuição de raridade: ~50% comum, 30% raro, 15% épico, 5% lendário.

Upload para bucket público `cosmetics` (e `avatars-catalog`) via storage, e `image_url` aponta para a URL pública. (Geramos local + subimos via supabase storage_upload.)

Script de geração: usa skill `ai-gateway` com `google/gemini-3-flash-image-preview` e fundo transparente. Após gerar, faz QA visual (montagem grid) antes de seedar.

Seed SQL popula `avatars` e `cosmetic_items` com nome, categoria, raridade, regra de desbloqueio (ex.: cavaleiro lendário = 100 medalhas; coroa épica = 500 Auris; pet dragão = 30 dias de streak).

---

## 3. Frontend

### Tokens de design (em `index.css`)
- `--rarity-common`, `--rarity-rare`, `--rarity-epic`, `--rarity-legendary` (HSL)
- Glow: `--glow-rare`, `--glow-epic`, `--glow-legendary`
- Animações: `unlock-burst`, `rarity-shimmer`, `equip-pop`

### Componentes novos (`src/components/cosmetics/`)
- `RarityBadge` — chip colorido com nome/cor
- `RarityFrame` — moldura ao redor de imagem (com glow)
- `AvatarDisplay` — avatar com moldura de raridade
- `EquippedAvatar` — composição: avatar no centro + slots posicionados (elmo topo, armadura esq, arma dir, pet abaixo-dir, aura ao fundo)
- `ItemCard` — card de item (com estado bloqueado)
- `UnlockToast` — animação ao desbloquear
- `LevelBadge` — nível + barra de XP

### Telas novas
- `src/pages/app/CosmeticCatalog.tsx` (rota `/app/criancas/:childId/cosmeticos`) — biblioteca completa para responsável visualizar progresso da criança.
- `src/pages/c/Wardrobe.tsx` (acessada via `/c#tab=guarda-roupa`) — UI infantil cartoon para a criança trocar avatar e equipar itens desbloqueados.
- Nova `ChildProfileView` (componente reutilizável) — substitui o cabeçalho atual em:
  - `src/pages/app/ChildProfile.tsx` (responsável)
  - `src/pages/ChildHome.tsx` (criança)
  - Cards de ranking em `Dashboard`, `Groups`, `GroupDetail`, missões
  - Mostra: avatar equipado com slots, nome, level + XP, Auris, badge favorita

### Integrações em telas existentes
- `Dashboard.tsx` (responsável): ranking usa `EquippedAvatar` mini + level.
- `ChildHome.tsx`: cabeçalho com avatar grande equipado, level, botão "Guarda-roupa" abre `Wardrobe`. Toast de novidades ao detectar `newly_unlocked`.
- `GroupDetail.tsx` / `Missions.tsx`: lista de participantes usa avatar equipado + raridade.

### Sidebar
- Novo item "Cosméticos" (admin) em `/app/admin/cosmeticos` para gerenciar catálogo (CRUD básico, opcional v2 — no MVP só seed).

---

## 4. Fluxo de desbloqueio

1. Criança envia atividade → aprovada.
2. Trigger `evaluate_cosmetic_unlocks` roda → insere em `child_unlocked_*` se atingiu marcos.
3. Próximo `get_child_dashboard` traz `newly_unlocked` (itens com `unlocked_at > last_seen_at`).
4. App da criança mostra modal "Você desbloqueou!" com `RarityFrame` + animação.
5. Criança pode equipar imediatamente.
6. Primeiro avatar: respons. escolhe ao criar criança (modal em `Children.tsx`). Se não escolher, recebe humano comum padrão.

---

## 5. Etapas de execução

1. **Migration**: enums, tabelas, RLS, funções `compute_child_level` + `evaluate_cosmetic_unlocks`, triggers, atualização de `get_child_dashboard`.
2. **Buckets storage**: criar `cosmetics` e `avatars-catalog` (públicos).
3. **Gerar arte**: rodar geração IA (avatares + itens) + upload + seed SQL.
4. **Edge function** `equip-cosmetic`.
5. **Design tokens** de raridade em `index.css`.
6. **Componentes** cosméticos reutilizáveis.
7. **Telas**: `Wardrobe` (criança), `CosmeticCatalog` (responsável), refactor `ChildProfileView`.
8. **Integrações**: Dashboard, ChildHome, GroupDetail, Missions, rankings.
9. **Modal de primeiro avatar** ao criar criança.
10. **Modal de novidades** + animações de desbloqueio.

---

## Fora de escopo (v2)

- Editor de avatar (corpo customizado peça por peça).
- Sistema de baús/loja de itens.
- Temporadas/eventos sazonais.
- CRUD admin completo de catálogo (no MVP, gerenciamos por seed/migration).
- Trocas entre crianças.

Aguardando aprovação para começar pela migration + geração de arte.
