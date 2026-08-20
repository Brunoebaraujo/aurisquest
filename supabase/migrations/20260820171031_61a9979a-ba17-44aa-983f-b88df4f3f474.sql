-- Stable renderer identities. Catalog UUIDs remain the relational identity;
-- these keys connect catalog entries to versioned avatar layouts.
ALTER TABLE public.avatars
  ADD COLUMN IF NOT EXISTS avatar_key text;

ALTER TABLE public.cosmetic_items
  ADD COLUMN IF NOT EXISTS equipment_key text;

CREATE UNIQUE INDEX IF NOT EXISTS avatars_avatar_key_unique
  ON public.avatars (avatar_key)
  WHERE avatar_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cosmetic_items_equipment_key_unique
  ON public.cosmetic_items (equipment_key)
  WHERE equipment_key IS NOT NULL;

ALTER TABLE public.avatars
  DROP CONSTRAINT IF EXISTS avatars_avatar_key_format,
  ADD CONSTRAINT avatars_avatar_key_format
    CHECK (avatar_key IS NULL OR avatar_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$');

ALTER TABLE public.cosmetic_items
  DROP CONSTRAINT IF EXISTS cosmetic_items_equipment_key_format,
  ADD CONSTRAINT cosmetic_items_equipment_key_format
    CHECK (equipment_key IS NULL OR equipment_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$');

-- Register the existing Gael/Guardian catalog records without changing
-- ownership, unlock rules, rarity, or the equipment currently worn by a child.
WITH candidate AS (
  SELECT id
  FROM public.avatars
  WHERE avatar_key IS NULL
    AND (lower(name) = 'gael' OR image_url ILIKE '%gael%')
  ORDER BY active DESC, sort_order, id
  LIMIT 1
)
UPDATE public.avatars AS avatar
SET avatar_key = 'gael'
FROM candidate
WHERE avatar.id = candidate.id
  AND NOT EXISTS (
    SELECT 1 FROM public.avatars registered WHERE registered.avatar_key = 'gael'
  );

WITH candidates AS (
  SELECT
    id,
    CASE category
      WHEN 'elmo' THEN 'helmet_guardian_blue'
      WHEN 'armadura' THEN 'armor_guardian_blue'
      WHEN 'arma' THEN 'sword_guardian_blue'
      WHEN 'pet' THEN 'pet_guardian_fox'
    END AS render_key,
    row_number() OVER (PARTITION BY category ORDER BY active DESC, sort_order, id) AS position
  FROM public.cosmetic_items
  WHERE equipment_key IS NULL
    AND category IN ('elmo', 'armadura', 'arma', 'pet')
    AND (lower(name) ~ '(guardian|guardião|guardiao)' OR image_url ILIKE '%guardian%')
    AND (category <> 'arma' OR lower(name) ~ '(sword|espada)' OR image_url ILIKE '%sword%')
    AND (category <> 'pet' OR lower(name) ~ '(fox|raposa)' OR image_url ILIKE '%fox%')
), selected AS (
  SELECT id, render_key
  FROM candidates
  WHERE position = 1
)
UPDATE public.cosmetic_items AS item
SET equipment_key = selected.render_key
FROM selected
WHERE item.id = selected.id
  AND NOT EXISTS (
    SELECT 1
    FROM public.cosmetic_items registered
    WHERE registered.equipment_key = selected.render_key
  );

-- Create canonical catalog entries only when this environment does not yet
-- contain a matching Gael/Guardian record. They remain manual rewards and are
-- not automatically equipped on any child.
INSERT INTO public.avatars (
  name, description, category, image_url, rarity, unlock_rule_type,
  unlock_threshold, sort_order, active, avatar_key
)
SELECT
  'Gael', 'Avatar modular de Gael', 'humano',
  '/avatar-assets/gael_avatar_base_v1.png', 'comum', 'starter',
  0, 0, true, 'gael'
WHERE NOT EXISTS (SELECT 1 FROM public.avatars WHERE avatar_key = 'gael');

UPDATE public.avatars
SET image_url = '/avatar-assets/gael_avatar_base_v1.png'
WHERE avatar_key = 'gael';

INSERT INTO public.cosmetic_items (
  name, description, category, rarity, image_url, unlock_rule_type,
  unlock_threshold, sort_order, active, equipment_key
)
SELECT seed.name, seed.description, seed.category::public.cosmetic_category,
       seed.rarity::public.cosmetic_rarity, seed.image_url,
       'manual'::public.unlock_rule_type, 0, seed.sort_order, true, seed.equipment_key
FROM (VALUES
  ('Elmo Guardião Azul', 'Elmo do conjunto Guardião Azul', 'elmo', 'raro',
   '/avatar-assets/helmet_guardian_blue_inventory_v1.png', 100, 'helmet_guardian_blue'),
  ('Armadura Guardião Azul', 'Bundle visual com armadura, cinto, botas e escudo', 'armadura', 'raro',
   '/avatar-assets/armor_guardian_blue_avatar_v1.png', 110, 'armor_guardian_blue'),
  ('Espada Guardião Azul', 'Espada do conjunto Guardião Azul', 'arma', 'raro',
   '/avatar-assets/sword_guardian_blue_avatar_v1.png', 120, 'sword_guardian_blue'),
  ('Raposa Guardiã', 'Companheira do conjunto Guardião Azul', 'pet', 'raro',
   '/avatar-assets/pet_guardian_fox_scene_v1.png', 130, 'pet_guardian_fox')
) AS seed(name, description, category, rarity, image_url, sort_order, equipment_key)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cosmetic_items item WHERE item.equipment_key = seed.equipment_key
);

COMMENT ON COLUMN public.avatars.avatar_key IS
  'Stable key used by AvatarRenderer layouts, for example gael.';
COMMENT ON COLUMN public.cosmetic_items.equipment_key IS
  'Stable key used by AvatarRenderer layers, for example armor_guardian_blue.';