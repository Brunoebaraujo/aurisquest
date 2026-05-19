## Sistema de XP, Level e Títulos — Auris Quest

### 1. Backend — função `compute_child_level` reescrita

Nova fórmula (substitui a atual baseada em auris+medalhas+streak):

- Para cada submissão aprovada, XP = `reward_auris × multiplier(activity.frequency_hint)`.
- Multiplicadores:
  - `diaria` → 1.0
  - `3x_semana` → 1.5
  - `semanal` → 2.0
  - `quinzenal` → 3.0
  - `mensal` → 5.0
  - `quest_especial` → 8.0
  - (default/null) → 1.0
- Soma também XP de `mission_awards.bonus_auris × 8.0` (tratados como quest especial) e `shared_mission_awards.bonus_auris × 8.0`.

Curva de level (geométrica suave):
- Custo do nível N (para sair de N-1 → N) = `round(100 × 1.2^(N-1))`.
- Total XP acumulado para atingir level N = soma dos custos.
- Loop em PL/pgSQL determina `level` percorrendo de 1..∞ enquanto `total_xp >= soma`.

Retorno do JSON (mantém shape compatível com `LevelInfo`):
```
{ level, xp, xp_in_level, xp_to_next, total_xp, title }
```
Adiciona `title` calculado server-side via lookup:
1 Escudeiro · 2 Aventureiro Iniciante · 3 Explorador · 4 Aventureiro Real · 5 Guardião da Jornada · 6 Protetor Real · 7 Defensor Auris · 8 Mestre Explorador · 9 Campeão da Guilda · 10 Herói Auris · 11 Lenda da Guilda · 12 Guardião Supremo · 13 Mestre dos Reinos · 14 Lenda Eterna · 15+ Guardião de Auroria.

Sem migração de schema (só `CREATE OR REPLACE FUNCTION`). `frequency_hint` já existe em `activities`.

### 2. Cadastro de atividades (Pais)

`src/pages/app/Activities.tsx`: ampliar o `<select>` de `frequency_hint` para incluir as 6 opções (`diaria`, `3x_semana`, `semanal`, `quinzenal`, `mensal`, `quest_especial`) com rótulos amigáveis. Adicionar texto auxiliar explicando que a frequência afeta o XP da jornada (não os Auris, que seguem o tier).

XP **não** é editável manualmente — confirmado pelo design.

### 3. Frontend — perfil infantil

**`ChildShowcase.tsx`:**
- Remover `titleFor` local. Receber `title` como prop (vindo de `level_info.title`).
- Selo dourado abaixo do avatar continua mostrando o número do level — adicionar `animate-pulse`/glow azul Auris quando `justLeveledUp`.
- Caixa do nome: nome em cima, **título** em destaque logo abaixo (já existe, só plugar `title`).
- Adicionar **barra de XP** dentro da mesma caixa, abaixo do título: `<Progress value={pct} />` discreta, sem números técnicos (só barra + label "Próximo nível").

**`LevelBadge.tsx`:** manter como widget compacto para outros locais (header, ranking). Sem mudança estrutural.

**`ChildHome.tsx` / `ChildProfile.tsx`:** passar `level_info.title` para o `ChildShowcase`.

### 4. Feedback de Level Up

Novo hook simples em `ChildHome.tsx`:
- Guardar `prevLevel` em `localStorage` por criança.
- Quando `level_info.level > prevLevel`, abrir modal/overlay leve (reusar estilo do `RewardRevealModal`) com:
  - Brilho azul (`bg-gradient-primary` + partículas via CSS `animate-pulse` + halo radial).
  - Texto: **"Level Up!"** e **"{Nome} agora é um {novo título}!"**.
  - Botão "Continuar".
- Selo do level recebe classe `animate-pulse` por ~3s após o evento (glow). Som fica como TODO comentado.

### 5. Limpeza / consistência

- Tipo `LevelInfo` ganha `title?: string`.
- `useFamilyCosmetics` não muda (só usa `level` numérico).
- Onboarding seed mantém `frequency_hint` atuais (compatíveis).

### Fora do escopo

- Migrar dados antigos / recalcular histórico (a função é STABLE e recalcula on-the-fly em cada chamada — sem cache).
- Sons reais (apenas placeholder).
- Editor admin de títulos (lookup fixo no SQL e/ou util TS).
- Reequilíbrio de Auris (tiers permanecem 1/3/5 como já estão).

### Resumo do impacto técnico

- 1 migração: `CREATE OR REPLACE FUNCTION public.compute_child_level`.
- ~4 arquivos front editados: `ChildShowcase.tsx`, `LevelBadge.tsx` (type), `ChildHome.tsx`, `ChildProfile.tsx`, `Activities.tsx`.
- 1 componente novo: `LevelUpModal.tsx` (ou reuso direto do RewardRevealModal com variante).
