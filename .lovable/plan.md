# Rewards Marketplace — Implementation Plan

Evolves the existing **Payments** module into a flexible **Rewards** system. No data is deleted; legacy payments become reward-history entries automatically.

---

## 1. Database changes (single migration)

### New tables

**`rewards`** — parent-managed catalog
- `family_id` (fk families)
- `name` (text)
- `description` (text, nullable)
- `auris_cost` (int, >0)
- `category` (enum: `money`, `screen_time`, `privilege`, `experience`, `item`, `custom`)
- `active` (bool, default true)
- `created_by` (uuid)
- Future-ready (nullable, unused for now): `image_url`, `stock`, `available_from`, `available_until`, `metadata jsonb`
- Standard `id`, `created_at`, `updated_at`

**`reward_redemptions`** — request/approval ledger
- `family_id`, `child_id`, `reward_id` (nullable so legacy survives if reward deleted)
- `reward_name_snapshot` (text) — preserves name even if catalog changes
- `reward_category_snapshot` (text)
- `auris_cost` (int) — locked at request time
- `status` (enum: `pendente`, `aprovado`, `recusado`, `concluido`)
- `requested_at`, `reviewed_at`, `reviewed_by`, `review_note`
- `legacy_payment_id` (nullable, for migrated rows)

Both tables get GRANTs + RLS scoped to `family_id = get_user_family_id(auth.uid())`, plus `service_role` for edge functions.

### Balance logic
A child's current Auris balance becomes:
```
approved submissions − (approved + completed redemptions) − legacy payments.auris_redeemed
```
Legacy `payments` rows stay untouched **and** also get a mirrored row in `reward_redemptions` (status `concluido`, `legacy_payment_id` set, category `money`, name `"Dinheiro — R$X,XX"`). To avoid double-counting, the balance query subtracts redemptions **excluding** rows where `legacy_payment_id IS NOT NULL` OR continues to subtract from `payments` and skips legacy mirror rows. Plan: **balance subtracts redemptions only when `legacy_payment_id IS NULL`** + the existing `payments` table. This way nothing in the existing dashboard/Auris math breaks.

### Migration data step
Insert mirror rows into `reward_redemptions` for every existing `payments` row (status `concluido`, snapshot name `"Dinheiro — R$ X,XX"`, category `money`).

### Child dashboard RPC
Extend `get_child_dashboard` to include:
- `rewards_catalog` (active rewards for family)
- `reward_redemptions` (child's history)
- balance fields (lifetime earned, lifetime redeemed, current)

### Edge function `redeem-reward`
Validates child token, checks balance, inserts `reward_redemptions` row with status `pendente`. Reuses `validate_child_token` pattern from existing `child-submit`.

---

## 2. Parent UI

### `src/pages/app/Rewards.tsx` (renamed file, replaces `Payments.tsx`)
- Header: **Recompensas** / "Crianças podem trocar Auris pelas recompensas que você criar."
- Keep: rate-config dialog, cleanup-photos button.
- Summary stat cards: Total Earned, Total Redeemed, Current Family Balance, Most Redeemed Reward.
- Per-child cards: Name, Current Balance, Lifetime Earned, Lifetime Redeemed.
- **Pending Approvals** section: list of `pendente` redemptions with Approve/Reject buttons.
- **Reward History**: unified list (legacy + new), filterable by child.

### `src/pages/app/RewardCatalog.tsx` (new route)
- List of rewards with Create / Edit / Deactivate / Delete actions.
- Form fields: name, description, category, auris_cost, active toggle.
- Delete blocked when redemptions exist (deactivate instead).

### Sidebar/Route updates
- `AppLayout` / `AppSidebar` / `App.tsx`: rename "Pagamentos" → "Recompensas"; add sub-route "Catálogo".

---

## 3. Child UI

### `src/pages/ChildHome.tsx` (or its rewards section)
- Show current Auris balance prominently.
- **Loja de Recompensas** grid: cards with name, cost (with AuriIcon), description, "Resgatar" button.
- Disabled state + "Auris insuficientes" when balance < cost.
- Click → call `redeem-reward` edge function → toast "Pedido enviado para aprovação".
- Show child's own redemption history (status badges).

---

## 4. Files touched

**Migration:** 1 new file via `supabase--migration`
**New files:**
- `supabase/functions/redeem-reward/index.ts`
- `src/pages/app/Rewards.tsx` (replaces Payments)
- `src/pages/app/RewardCatalog.tsx`
- `src/components/rewards/RewardCard.tsx`
- `src/components/rewards/RewardFormDialog.tsx`
- `src/components/rewards/PendingApprovalsList.tsx`

**Edited:**
- `src/App.tsx` (routes)
- `src/components/AppSidebar.tsx` (nav labels)
- `src/pages/ChildHome.tsx` (rewards shop section)
- `src/integrations/supabase/types.ts` regenerates automatically after migration

**Removed:** `src/pages/app/Payments.tsx` (replaced by Rewards.tsx)

---

## 5. Acceptance check
- [ ] Legacy payments visible in Reward History as "Dinheiro — R$X"
- [ ] Balances unchanged for every child after migration
- [ ] Parent can CRUD rewards
- [ ] Child redeem → pending → parent approve → Auris deducted
- [ ] Reject → no deduction
- [ ] Stat cards calculated live
- [ ] Mobile-first layout, AuriQuest visual identity preserved
