## Painel Administrativo de Utilização

Nova área **Admin → Utilização** (`/app/admin/utilizacao`) e **Admin → Alertas** (`/app/admin/alertas`), acessíveis apenas com role `admin`. Toda a leitura é feita por funções `SECURITY DEFINER` que retornam **somente agregados e identificadores** — nunca nomes de criança, fotos, descrições ou notas privadas.

---

### 1. Privacidade — regras inegociáveis

A função SQL admin retorna:
- ✅ Nome da família, nome do grupo, datas, contagens, médias, status.
- ❌ **Nunca**: nomes/avatares de crianças, `photo_url`, `review_note`, `description` de atividades, conteúdo de submissões, valores R$ por pagamento.
- Crianças são apresentadas como "Criança 1, Criança 2…" (ordem estável por `id`).
- Admin não tem ação alguma sobre submissões de outras famílias (somente leitura agregada).

---

### 2. Backend — funções SQL `SECURITY DEFINER`

Todas começam com `if not has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;`.

**`admin_usage_overview(_from timestamptz, _to timestamptz, _group_id uuid default null, _family_status text default null)`** → `jsonb`:
- `globals`: famílias cadastradas/ativas no período, responsáveis, crianças cadastradas/ativas, submissões (total/aprovadas/recusadas/pendentes), taxa de aprovação, tempo médio de aprovação (`avg(reviewed_at - submitted_at)` em horas), missões criadas/em andamento/concluídas, medalhas concedidas, Auris distribuídos no período, média de Auris por criança ativa, famílias e crianças sem atividade em 7d, retenção semanal (% de famílias ativas em 2 semanas consecutivas dentro do período).
- `series.submissionsPerDay`: `[{day, count}]`
- `series.activeFamiliesPerWeek`: `[{week, count}]`
- `series.approvedVsRejected`: `[{day, aprovado, recusado}]`
- `series.aurisPerMonth`: `[{month, auris}]` (últimos 12 meses, fixo)
- `funnel`: convidadas, ativadas (status=ativa), com criança, com 1ª submissão, com 1ª aprovação.

**`admin_usage_families(_from, _to, _group_id, _family_status)`** → `jsonb` array:
Uma linha por família com: `family_id`, `family_name`, `group_name` (1º grupo), `status`, `parents_active` (responsáveis com login nos últimos 30d via `auth.users.last_sign_in_at`), `children_count`, `children_active` (com submissão no período), `submissions_period`, `pending`, `missions_in_progress`, `missions_completed`, `auris_distributed`, `last_activity_at` (max submissão/pagamento/missão), `adherence_score` (0-100, calculado abaixo).

**Score de aderência (0-100):**
```
freq      = min(submissions_period / dias_periodo / max(children_count,1) * 30, 1) * 35
ativos    = (children_active / max(children_count,1)) * 25
aprov     = (1 - clamp(avg_approval_hours/72, 0, 1)) * 15        -- ≤72h é bom
miss      = clamp((missions_in_progress + 2*missions_completed)/3, 0, 1) * 15
recente   = (1 if last_activity_at >= now()-7d else 0) * 10
score     = round(freq + ativos + aprov + miss + recente)
```
Faixas: 80-100 alta, 50-79 média, 0-49 baixa.

**`admin_usage_alerts()`** → `jsonb` com 5 listas (cada item = `{family_id, family_name, value}`):
- `inactive7d`: famílias com `last_activity < now()-7d` (e `status=ativa`).
- `pendingHeavy`: famílias com `pending > 10` ou pendência mais antiga > 72h.
- `noChildren`: criadas há 3+ dias sem nenhuma criança.
- `noSubmissions`: com criança há 7+ dias e zero submissão.
- `staleMissions`: missões ativas criadas há 14+ dias com 0 submissões aprovadas vinculadas.

---

### 3. Frontend

**`src/pages/app/AdminUsage.tsx`**
- Filtros no topo: período (Select: 7d, 30d, mês atual, mês anterior, personalizado com `Calendar` do shadcn em Popover, `pointer-events-auto`), grupo (Select), status (Select), família (Combobox opcional para "drill" em uma família).
- 6 cards: Famílias ativas, Crianças ativas, Submissões no período, Missões em andamento, Taxa de aprovação, Tempo médio de aprovação.
- Gráficos em grid 2 colunas usando **Recharts** (já incluído pelo shadcn `chart.tsx`):
  1. `LineChart` — submissões por dia
  2. `BarChart` — famílias ativas por semana
  3. `BarChart` empilhado — aprovadas vs recusadas
  4. `LineChart` — Auris/mês
  5. Funil — `BarChart` horizontal com 5 etapas (recharts não tem funil nativo; barras decrescentes resolvem)
- Tabela "Famílias" com todas as colunas listadas + badge de score colorido (verde/amarelo/vermelho). Ordenação clicável; busca por nome de família.
- Loader/skeleton enquanto carrega.

**`src/pages/app/AdminAlerts.tsx`**
- 5 cards-tabelas, cada um listando até 50 famílias do alerta, com link "Ver detalhes" que abre o painel `AdminUsage` filtrado naquela família.

**`src/components/AppSidebar.tsx`** — no grupo Admin, adicionar:
- "Utilização" (`/app/admin/utilizacao`, ícone `BarChart3`)
- "Alertas" (`/app/admin/alertas`, ícone `AlertTriangle`)

**`src/App.tsx`** — registrar as duas rotas.

---

### 4. Arquivos

- **Novo:** `supabase/migrations/<ts>_admin_usage.sql` — cria `admin_usage_overview`, `admin_usage_families`, `admin_usage_alerts`.
- **Novo:** `src/pages/app/AdminUsage.tsx`
- **Novo:** `src/pages/app/AdminAlerts.tsx`
- **Editar:** `src/App.tsx`
- **Editar:** `src/components/AppSidebar.tsx`

---

### 5. Notas

- Responsivo: cards em grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`; gráficos `grid-cols-1 lg:grid-cols-2`; tabela com scroll horizontal em mobile.
- "Responsáveis ativos" usa `auth.users.last_sign_in_at` — acessível dentro de `SECURITY DEFINER` via `auth.users`.
- Nenhum dado de criança/foto/comentário trafega para o cliente admin.
