## Goal

Transform the child's `/c` (ChildHome) and parent's `/app/criancas/:id` (ChildProfile) screens into a true RPG character sheet matching the mockup, while preserving all current data, APIs, and behaviors. No DB changes.

## Slot mapping (visual-only, no backend changes)

The mockup shows 9 slots. The cosmetics system today has 6 real slots. Mapping:

| Mockup slot | Real backend slot | Behavior |
|---|---|---|
| Cabeça (Head) | `helmet_item_id` | Clickable → wardrobe |
| Peito (Chest) | `armor_item_id` | Clickable → wardrobe |
| Luvas (Gloves) | — | Locked silhouette, badge "Em breve" |
| Amuleto (Amulet) | `aura_item_id` | Clickable → wardrobe (Aura) |
| Anel (Ring) | — | Locked silhouette |
| Cinto (Belt) | — | Locked silhouette |
| Mão Principal | `weapon_item_id` | Clickable → wardrobe |
| Botas (Boots) | — | Locked silhouette |
| Mão Secundária | `pet_item_id` | Clickable (Pet appears here) |

The center character keeps using `EquippedAvatar` so the avatar always reflects real equipment. Frame stays as the avatar's rarity border.

## New / changed components

### 1. `src/components/cosmetics/CharacterSheet.tsx` (new, shared)

The single source of truth for the RPG layout. Used by both child and parent views.

Props:
```ts
type Props = {
  name: string;
  level: number;
  title?: string;
  xpInLevel: number;
  xpToNext: number;
  totalXp: number;
  nextLevelTotalXp: number;
  auris: number;       // balance
  medals: number;
  streak: number;
  pending: number;
  approved: number;
  paid: number;
  equipment: Equipment;
  onAvatarClick?: () => void;       // opens wardrobe
  onSlotClick?: (slot: SlotKey) => void; // opens wardrobe on that tab
  showBack?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  levelGlow?: boolean;
};
```

Internal layout (mobile-first, single column ≤640px, comfortable on desktop too):

```text
┌───────────────────────────────────────────────────┐
│ [←]                                          [×]  │  Header
├───────────────────────────────────────────────────┤
│ ┌─avatar─┐   Name ✏️                              │  Character Overview
│ │ portrait│   ◆ Title                              │
│ │   Lv N │   ┌─ XP bar ──────── 21/120 XP ┐       │
│ └────────┘                                        │
│ ┌Auris┐ ┌Medals┐ ┌Streak┐                         │
├───────────────────────────────────────────────────┤
│ ┌Pending┐ ┌Approved┐ ┌Paid┐ (blue / gold / green) │  Financial
├───────────────────────────────────────────────────┤
│           ◆ EQUIPAMENTOS ◆                        │  Equipment panel
│  ┌Cabeça┐                              ┌Amuleto┐  │
│  ┌Peito ┐         [Center avatar      ┌ Anel  ┐  │
│  ┌Luvas ┐          with equipment]    ┌ Cinto ┐  │
│         ┌Mão Princ.┐ ┌Botas┐ ┌Mão Sec.┐          │
├───────────────────────────────────────────────────┤
│ [📋 Atividades •]  [📅 Calendário]  [🏆 Ranking]  │  Sticky nav strip
└───────────────────────────────────────────────────┘
```

Sub-components inside the same file:
- `<SlotTile label item locked onClick rarity>` — renders one slot. Min 44×44px touch target. Common = gray, Rare = blue, Epic = orange, Legendary = purple border via existing `RarityFrame`. Locked tiles render a faint silhouette icon (lucide: `HardHat`, `Hand`, `Circle`, `Minus`, `Footprints`) with an "Em breve" pill.
- `<ResourceCard icon value label tone>` — for Auris / Medals / Streak.
- `<MoneyCard tone="pending|approved|paid">` — for the three financial cards. Tones map to existing tokens (warning / accent / success) with a softly themed bg.
- `<NavStrip onActivities onCalendar onRanking activityBadge>` — the sticky nav. Uses `scrollIntoView({ behavior: "smooth", block: "start" })` against refs passed in by the page.

Visuals: dark fantasy gradient on the equipment panel only (`bg-gradient-to-b from-primary/15 via-background to-secondary/10` plus a subtle inner shadow), gold accents for headings (`text-accent`). Card chrome uses existing semantic tokens — no hex colors in JSX.

### 2. `src/pages/ChildHome.tsx`

- Replace the existing top "Oi, {name}" block + LevelBadge card + 3 financial cards with `<CharacterSheet ... />`.
- Wire `onAvatarClick` and `onSlotClick(slot)` to open the existing `WardrobeDialog`. Add a `defaultTab` prop to `WardrobeDialog` so slot click pre-selects the matching tab (`elmo`, `armadura`, `arma`, `pet`, `aura`).
- Keep `activeSideQuest`, missions, Tabs (Atividades / Calendário / Ranking), SideQuestHistory, history, etc. untouched below the sheet.
- Add three section refs:
  - `activitiesRef` → wraps the existing Atividades Tab content (or the `<Tabs>` block, scrolling to the tablist and setting `tab="atividades"`).
  - `calendarRef` → existing Calendário tab.
  - `rankingRef` → existing Ranking tab.
- `<NavStrip>` switches the `<Tabs>` value and scrolls to it. Activities red-dot badge appears if `activeSideQuest && !activeSideQuest.completed_at`, or `missions.length > 0`.

### 3. `src/pages/app/ChildProfile.tsx`

- Replace `<ChildShowcase>` and the "X medalhas conquistadas" header with `<CharacterSheet ... />` using the parent's data.
- Resource numbers: `auris` from existing `approvedAuris - paidAuris` (or fetch `wallet`), `medals = wonMissions.length`, `streak` from the highest mission streak (or 0 if not readily available — derive via existing submissions logic already there).
- Financial cards (Pending / Approved / Paid): the parent screen doesn't expose these today. Fetch them in the same `load()` Promise.all using existing tables: `submissions` aggregated by `status` for pending/approved, and `payouts` (or whatever the parent dashboard already uses) for paid. **Spike note:** if a single RPC exists, prefer it; otherwise inline aggregation in `load()`.
- Slot clicks open the existing `<ParentWardrobeDialog>` (add same `defaultTab` prop).
- Below the sheet, keep: `<SideQuestHistory>`, "Visualizar como a criança" CTA, "Missões em andamento" card, "Medalhas conquistadas" card — unchanged.
- NavStrip targets refs around those sections (Atividades = missions in progress + history, Calendário = placeholder "Calendário de Aventuras — Em breve" card, Ranking = scroll to a small ranking placeholder or to the medals card if no ranking exists on this page).

### 4. `WardrobeDialog` / `ParentWardrobeDialog` (small change)

Add optional `defaultTab?: string` prop (forwarded to `<Tabs defaultValue={...}>`). Used by `CharacterSheet` to deep-link the wardrobe to the right slot.

## Mobile constraints

- All slot tiles, nav buttons, header buttons ≥ 44×44px.
- Equipment panel uses a 3-column grid on mobile: `[left slots] [center avatar] [right slots]` with `grid-template-columns: minmax(72px,1fr) minmax(140px,1.6fr) minmax(72px,1fr)`. Bottom row is a separate 3-column grid below.
- No horizontal scroll: panel `overflow-hidden`, slot tiles size with `w-full aspect-square`.
- The sticky `NavStrip` becomes `sticky bottom-0` only on mobile (`md:static`) so it acts like a quick-jump tab bar.

## Not changing

- No DB migrations.
- No edge function changes.
- No changes to XP / Auris / Medals / Streak / Missions / Side Quests / Rewards business logic.
- No changes to `EquippedAvatar` rendering rules.
- Existing `ChildShowcase` stays in the repo (still used by the parent screen until the swap; safe to remove after).

## Files touched

- new: `src/components/cosmetics/CharacterSheet.tsx`
- edit: `src/pages/ChildHome.tsx` (swap top section, add nav refs)
- edit: `src/pages/app/ChildProfile.tsx` (swap showcase, add Pending/Approved/Paid fetch, add nav refs + Calendar placeholder)
- edit: `src/components/cosmetics/WardrobeDialog.tsx` (add `defaultTab`)
- edit: `src/components/cosmetics/ParentWardrobeDialog.tsx` (add `defaultTab`)

## Acceptance

1. Child opens `/c`: sees the RPG sheet with their avatar, level, XP bar, Auris/Medals/Streak, Pending/Approved/Paid, equipment panel with their 6 real items shown + 3 silhouettes labeled "Em breve". Below, all current sections still work (Side Quest, missions, Atividades/Calendário/Ranking).
2. Tapping a real slot opens the wardrobe on that slot's tab; tapping a locked slot shows a soft "Em breve" toast or just stays inert.
3. Tapping the avatar opens the wardrobe on the "Avatar" tab.
4. NavStrip buttons smooth-scroll to the right section and switch the underlying Tab on the child page.
5. Parent at `/app/criancas/:id` sees the same RPG sheet with the child's real numbers and equipment (read-only equip via the existing `ParentWardrobeDialog`).
6. No horizontal scroll at 360px width. All touch targets ≥ 44px.
