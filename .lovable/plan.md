
## Visão geral

Duas mudanças interligadas:

1. **Economia em Auris** (✦): toda recompensa do app passa a ser **Auris** (no lugar de R$). R$ só aparece no momento do pagamento, usando uma **taxa de conversão fixa por família**. Migração: 1 real existente = 1 Auri (arredondado).
2. **Grupos compartilhados**: um responsável cria um grupo (família estendida, escola, condomínio), convida outros responsáveis por e-mail, e cria missões compartilhadas que rendem **apenas Auris** (sem dinheiro). Apenas o dono do grupo cria missões.

---

## Identidade visual do Auri

- A imagem enviada (cristal azul com "A") será o ícone oficial.
- Salvar em `src/assets/auri.png` (a partir do upload).
- Componente `<AuriIcon className="..." />` em `src/components/AuriIcon.tsx` que renderiza a imagem com `alt="Auri"`. Aceita `size` (default 16). Usado em todos os lugares onde antes tinha cifrão/ícone de moeda.
- Helper de formatação `formatAuris(n)` em `src/lib/format.ts` → retorna apenas o número formatado (ex: `"123"`); a UI compõe `<AuriIcon /> 123` lado a lado, ou `123 Auris` em texto puro.
- Singular/plural: `1 Auri`, `2 Auris`. Helper utilitário `aurisLabel(n)`.
- Tooltip discreto no ícone: "Auri — moeda da Jornada".

---

## Parte 1 — Economia em Auris

### Schema (migração SQL)

```sql
ALTER TABLE families      ADD COLUMN auris_per_real INTEGER NOT NULL DEFAULT 1;
ALTER TABLE activities    ADD COLUMN reward_auris   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions   ADD COLUMN reward_auris   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE missions      ADD COLUMN bonus_auris    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mission_awards ADD COLUMN bonus_auris   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments      ADD COLUMN auris_redeemed INTEGER NOT NULL DEFAULT 0;

UPDATE activities  SET reward_auris = GREATEST(1, ROUND(reward_amount_cents/100.0))::int WHERE reward_amount_cents > 0;
UPDATE submissions SET reward_auris = GREATEST(0, ROUND(reward_amount_cents/100.0))::int;
UPDATE missions    SET bonus_auris  = ROUND(bonus_amount_cents/100.0)::int;
UPDATE mission_awards SET bonus_auris = ROUND(bonus_amount_cents/100.0)::int;
```

Colunas `*_cents` ficam como compatibilidade (não removemos agora). `payments.amount_cents` continua sendo o R$ pago no resgate.

### Funções a atualizar

- `evaluate_missions_for_submission`: bônus sintético com `reward_auris = bonus_auris`.
- `get_child_dashboard`:
  - `totals` → `pending_auris`, `approved_auris`.
  - `paid_auris` = `SUM(auris_redeemed)`.
  - `ranking.earned_auris`.
  - Missões expõem `bonus_auris`.
  - Inclui `family.auris_per_real` para cálculo de equivalência.

### Frontend (substituir formatBRL → formatAuris + AuriIcon)

- **Activities.tsx**: campo "Recompensa (Auris)" inteiro, salva `reward_auris`.
- **Missions.tsx**: bônus em Auris.
- **Pending.tsx**: badge com `<AuriIcon /> X`.
- **ChildHome.tsx**: cards Pendente/Aprovado/Pago com Auris; missões e ranking idem.
- **ChildProfile.tsx**: medalhas/missões em Auris.
- **Dashboard.tsx**: "Auris ganhos no mês"; saldo por criança em Auris + equivalente R$ entre parênteses.
- **Payments.tsx**:
  - Saldos em Auris.
  - Diálogo: input "Auris a resgatar" + preview ao vivo "≈ R$ Y,YY" usando `auris_per_real`.
  - Insere `auris_redeemed` + `amount_cents` derivado.
- **Configurações da família** (novo card no Dashboard): editar `auris_per_real` ("Quantos Auris valem R$1?"). Default `1`.

---

## Parte 2 — Grupos compartilhados

### Schema

```sql
CREATE TYPE group_type AS ENUM ('familia_estendida','escola','condominio','outro');
CREATE TYPE shared_mission_mode AS ENUM ('coletiva','individual');

CREATE TABLE shared_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type group_type NOT NULL DEFAULT 'outro',
  description TEXT,
  owner_user_id UUID NOT NULL,
  owner_family_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shared_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES shared_groups(id) ON DELETE CASCADE,
  family_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, family_id)
);

CREATE TABLE shared_group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES shared_groups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID
);

CREATE TABLE shared_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES shared_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  activity_name TEXT NOT NULL,    -- texto livre (não vincula activities)
  mode shared_mission_mode NOT NULL,
  goal_type goal_type NOT NULL,   -- reusa enum existente (total|streak)
  goal_target INTEGER NOT NULL,
  bonus_auris INTEGER NOT NULL DEFAULT 0,
  medal_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shared_mission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES shared_missions(id) ON DELETE CASCADE,
  child_id UUID NOT NULL,
  family_id UUID NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID NOT NULL
);

CREATE TABLE shared_mission_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES shared_missions(id) ON DELETE CASCADE,
  child_id UUID,                   -- NULL em coletivas
  family_id UUID,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  bonus_auris INTEGER NOT NULL DEFAULT 0,
  UNIQUE (mission_id, child_id)
);
```

### Permissões

- Função `is_group_member(_uid, _group_id)` SECURITY DEFINER.
- `shared_groups`: SELECT por membros/dono. INSERT/UPDATE/DELETE só pelo dono (`owner_user_id = auth.uid()`).
- `shared_group_members`: SELECT por membros; INSERT/DELETE só dono.
- `shared_group_invitations`: tudo só dono. Validação pública via RPC.
- `shared_missions`: SELECT por membros; mutações só dono.
- `shared_mission_logs`: SELECT por membros; INSERT pelo responsável da família da criança (`family_id = get_user_family_id(auth.uid())`).
- `shared_mission_awards`: gravado por trigger SECURITY DEFINER.

### Crédito de Auris

Quando uma criança ganha bônus de missão compartilhada, criamos `submissions` sintética **na família dela** (mesma técnica usada para missão familiar):
- `reward_auris = bonus_auris`, `status = 'aprovado'`, `review_note = 'Bônus do grupo X — missão Y'`.
- Em **missão coletiva**: divide o bônus entre crianças que contribuíram (`floor(bonus / n)`, mínimo 1).

### RPCs

- `accept_shared_group_invitation(_token)`: valida token, adiciona família do usuário, marca aceito, garante role `parent`.
- `get_shared_group(_group_id)`: grupo + membros + crianças + missões + progresso + conquistas.
- Trigger `evaluate_shared_mission_after_log` em `shared_mission_logs` insert.

### Frontend

- **Sidebar**: novo item "Grupos" (`/app/grupos`) para todos responsáveis.
- **`/app/grupos`**: lista grupos; botão "Criar grupo".
- **`/app/grupos/:id`**:
  - Header com nome/tipo/descrição. Se dono: botões "Convidar responsável" (input email + zod), "Nova missão compartilhada".
  - Aba **Membros**: famílias e crianças.
  - Aba **Missões**: cards com progresso. Responsável marca "Concluído" para suas crianças (cria `shared_mission_logs`).
  - Aba **Convites** (só dono): pendentes, copiar link, cancelar, renovar.
- **`/grupo-convite/:token`** (público): aceita convite. Se não logado, vai para `/auth?next=/grupo-convite/:token`.
- **ChildHome.tsx**: nova seção "Missões do grupo" com missões compartilhadas onde a criança participa (via dashboard RPC estendida).

### Convites

- Por enquanto: **link copiável** (mesmo modelo de `AdminFamilies`). Email automático fica para etapa futura.

---

## Sequência de implementação

1. Salvar `auri.png` em `src/assets/` + criar `<AuriIcon>`.
2. Migração SQL: colunas Auris + tabelas de grupos + RLS + funções/triggers.
3. Atualizar `evaluate_missions_for_submission` e `get_child_dashboard` para Auris e missões compartilhadas.
4. Helpers `formatAuris` / `aurisLabel`.
5. Substituir `formatBRL` em Activities, Missions, Pending, ChildHome, ChildProfile, Dashboard.
6. Card "Configurações da família" (taxa `auris_per_real`).
7. Pagamentos: input em Auris + preview de R$.
8. Páginas de grupos (lista, detalhe, convite público) + sidebar.
9. RPC `accept_shared_group_invitation` + tela `/grupo-convite/:token`.
10. Trigger de avaliação de missão compartilhada que credita Auris na família.

## Observações

- Colunas `*_cents` antigas mantidas por compatibilidade (não removidas agora).
- Pagamentos continuam em centavos de R$ no histórico; `auris_redeemed` registra a "moeda" usada.
- Apenas o dono do grupo cria/edita missões compartilhadas (resposta confirmada).
- Missões compartilhadas suportam ambos os modos (coletiva e individual).
