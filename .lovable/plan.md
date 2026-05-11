
# Refatoração visual e econômica — Auris Quest

## 1. Sistema visual: dois modos

**Modo Responsável (`/app/*`)** — manter clean, layout atual de dashboard. Pequenos ajustes:
- Reduzir uso de `bg-gradient-hero` em telas internas (atualmente o painel adulto já é clean — só padronizar)
- Tipografia: títulos com Fredoka (já está), corpo com Nunito.

**Modo Criança (`/c`, `/entrar`, `/familia/:t/entrar`, `/grupo`)** — visual mais cartoon/desenhado:
- Novo token de tema infantil em `index.css`: classe `.kid-theme` aplicada no root das páginas infantis, com:
  - Cores mais saturadas (turquesa + coral + amarelo dourado já existem, vamos intensificar)
  - Bordas mais grossas (`border-4`), cantos mais arredondados (`rounded-3xl`)
  - Sombras "stickers" (`shadow-[6px_6px_0_rgba(0,0,0,0.1)]`)
  - Background com padrão sutil (estrelas/nuvens via SVG repeat)
- Animações leves (framer-motion já não está; usar Tailwind keyframes existentes + novas: `bounce-soft`, `pop-in`, `wiggle`)
- Botões grandes (`size="xl"`), ícones grandes (32–48px)

## 2. Auri (moeda) — padronização

**Problema atual:** `AuriIcon` carrega `auri.png` (raster), tamanhos inconsistentes pelo app, sem glow.

**Solução:**
- Gerar `src/assets/auri.svg` (SVG cartoon — moeda dourada com "A" estilizado, brilho, sombra interna)
- Reescrever `AuriIcon.tsx` para:
  - Aceitar `size: "xs" | "sm" | "md" | "lg" | "xl" | number` (12/16/20/28/40 px)
  - Variantes: `glow` (sombra dourada), `flat`, `coin-stack` (3 moedas empilhadas)
  - Suporte a `animate` (rotação suave / pulse no ganho)
- Substituir todas as ocorrências `<AuriIcon size={N}>` para usar tamanhos semânticos
- Remover `auri.png` após migração

## 3. Economia: tiers globais fixos

**Constante única** em `src/lib/tiers.ts`:
```
ROTINA = 1, RESPONSABILIDADE = 3, DESAFIO = 5
```

**Migration DB:**
- Adicionar coluna `activities.tier text NOT NULL DEFAULT 'rotina'` (enum `activity_tier`: `rotina|responsabilidade|desafio`)
- Adicionar coluna `activities.icon_key text` (referência ao ícone da biblioteca) e `activities.icon_url text` (upload personalizado)
- **Auto-mapear existentes** baseado em `reward_auris`:
  - `1` → `rotina` (fixa em 1)
  - `2`–`3` → `responsabilidade` (fixa em 3)
  - `≥4` → `desafio` (fixa em 5)
- Recalcular `reward_auris` para o valor canônico do tier
- Trigger `BEFORE INSERT/UPDATE`: `reward_auris` é sempre derivado de `tier`, ignorando input arbitrário (fonte única da verdade)

**Frontend:**
- Form de atividade: remover input numérico de Auris; substituir por seletor visual de 3 cards (Rotina/Responsabilidade/Desafio) com ícone, cor e valor visíveis
- Listagens de atividades mostram tier como badge colorido

**Missões em grupo:** mantêm `bonus_auris` próprio (tiers separados — Bronze 5 / Prata 10 / Ouro 20), conforme escolhido. Aplicar mesma ideia de seletor visual no form de missão.

## 4. Biblioteca oficial de ícones cartoon (atividades)

Gerar **set IA** em `src/assets/activity-icons/` (PNG transparente cartoon, 256×256). Conjunto inicial (~20):
- escovar-dentes, tomar-banho, arrumar-cama, lição-de-casa, leitura, brincar, ajudar-cozinha, organizar-quarto, regar-plantas, alimentar-pet, passear-pet, exercício, instrumento-musical, idioma, meditação, ajudar-irmão, lavar-louça, tirar-lixo, levantar-cedo, dormir-cedo

**Cadastro `iconLibrary`** em `src/lib/iconLibrary.ts`: array de `{ key, label, src, category }`.

**No form de atividade:**
- Grid visual para escolher ícone (com busca por nome)
- Tab "Personalizado" → upload para bucket `activity-icons` (criar bucket público) salvo em `icon_url`
- Preview do ícone em todos os cards de atividade

## 5. Telas infantis — progresso visual

`ChildHome` ganha:
- **Card de atividade** com imagem grande (96px), nome, badge do tier com Auri, descrição
- **Streak** por atividade: chama de fogo + número de dias seguidos (já existe `compute_streak` no DB; expor por atividade no `get_child_dashboard`)
- **Barra de progresso** mais grossa e colorida nas missões
- **Badges** ganhas: galeria horizontal scrollável com brilho
- **Animação de ganho de Auris**: ao submeter, mostra +N Auris caindo (CSS keyframe)

## 6. Consistência visual

- Todos componentes que mostram Auris usam `<AuriIcon variant="glow">`
- Cores de tier: Rotina = `--primary` (turquesa), Responsabilidade = `--secondary` (coral), Desafio = `--accent` (dourado)
- Badges, cards de atividade, missões e quests compartilham mesma estética cartoon (bordas grossas, sombras stickers) só na área infantil

---

## Detalhes técnicos

### Migrations SQL
1. `CREATE TYPE activity_tier AS ENUM ('rotina','responsabilidade','desafio');`
2. `ALTER TABLE activities ADD COLUMN tier activity_tier NOT NULL DEFAULT 'rotina', ADD COLUMN icon_key text, ADD COLUMN icon_url text;`
3. UPDATE para mapear `reward_auris` → `tier` e normalizar `reward_auris`
4. Função + trigger `enforce_activity_tier_reward()` que sobrescreve `reward_auris` conforme `tier`
5. Atualizar `get_child_dashboard` para retornar `tier`, `icon_key`, `icon_url`, e `streak` por atividade
6. Bucket `activity-icons` (público) com policies de upload por família

### Arquivos a criar
- `src/assets/auri.svg`
- `src/assets/activity-icons/*.png` (20 ícones via imagegen)
- `src/lib/tiers.ts`
- `src/lib/iconLibrary.ts`
- `src/components/TierBadge.tsx`
- `src/components/TierSelector.tsx`
- `src/components/ActivityIconPicker.tsx`
- `src/components/ActivityIcon.tsx` (renderiza icon_key da lib OU icon_url custom)

### Arquivos a editar
- `src/components/AuriIcon.tsx` — variantes + SVG
- `src/index.css` — tokens kid-theme + keyframes
- `tailwind.config.ts` — animações novas
- `src/pages/app/Activities.tsx` — TierSelector + IconPicker, remover input Auris
- `src/pages/app/Missions.tsx` — TierSelector próprio (Bronze/Prata/Ouro)
- `src/pages/ChildHome.tsx` — cards com ícone, streak, animação ganho
- `src/pages/ChildLogin.tsx`, `ChildLoginFamily.tsx` — aplicar kid-theme reforçado
- Substituir `<AuriIcon size={N}>` em todo o projeto para variantes semânticas

### Fora de escopo (não mexer)
- Rotas, autenticação, RLS de outras tabelas
- Lógica de pagamentos
- Dashboard administrativo (`/app/admin/*`)

### Riscos
- Atividades existentes terão `reward_auris` recalculado (ex: 2 → 3, 7 → 5). Submissões antigas mantêm seu valor histórico (já gravado em `submissions.reward_auris`).
- Geração de 20 ícones IA leva alguns minutos.
