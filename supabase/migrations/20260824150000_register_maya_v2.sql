-- Register Maya and her current pink set with stable Avatar V2 renderer keys.
WITH candidate AS (
  SELECT id FROM public.avatars
  WHERE avatar_key IS NULL AND (lower(name) = 'maya' OR image_url ILIKE '%maya%')
  ORDER BY active DESC, sort_order, id LIMIT 1
)
UPDATE public.avatars AS avatar SET avatar_key = 'maya'
FROM candidate WHERE avatar.id = candidate.id
  AND NOT EXISTS (SELECT 1 FROM public.avatars WHERE avatar_key = 'maya');

INSERT INTO public.avatars (name, description, category, image_url, rarity, unlock_rule_type, unlock_threshold, sort_order, active, avatar_key)
SELECT 'Maya', 'Avatar modular da Maya', 'humano', '/avatar-assets/maya_avatar_base_v1.png', 'comum', 'starter', 0, 1, true, 'maya'
WHERE NOT EXISTS (SELECT 1 FROM public.avatars WHERE avatar_key = 'maya');

UPDATE public.avatars SET image_url = '/avatar-assets/maya_avatar_base_v1.png' WHERE avatar_key = 'maya';

WITH candidates AS (
  SELECT id, category,
    CASE category WHEN 'elmo' THEN 'tiara_guardian_pink' WHEN 'armadura' THEN 'armor_guardian_pink' WHEN 'arma' THEN 'staff_guardian_pink' END AS render_key,
    row_number() OVER (PARTITION BY category ORDER BY active DESC, sort_order, id) AS position
  FROM public.cosmetic_items
  WHERE equipment_key IS NULL AND category IN ('elmo','armadura','arma')
    AND ((category = 'elmo' AND lower(name) ~ '(tiara|coroa)')
      OR (category = 'armadura' AND lower(name) ~ '(rosa|pink|coração|coracao|maya)')
      OR (category = 'arma' AND lower(name) ~ '(cajado|staff)'))
), selected AS (SELECT id, render_key FROM candidates WHERE position = 1)
UPDATE public.cosmetic_items AS item SET equipment_key = selected.render_key
FROM selected WHERE item.id = selected.id
  AND NOT EXISTS (SELECT 1 FROM public.cosmetic_items WHERE equipment_key = selected.render_key);

INSERT INTO public.cosmetic_items (name, description, category, rarity, image_url, unlock_rule_type, unlock_threshold, sort_order, active, equipment_key)
SELECT seed.name, seed.description, seed.category::public.cosmetic_category, seed.rarity::public.cosmetic_rarity,
       seed.image_url, 'manual'::public.unlock_rule_type, 0, seed.sort_order, true, seed.equipment_key
FROM (VALUES
  ('Tiara Rosa da Maya', 'Tiara do conjunto atual da Maya', 'elmo', 'raro', '/avatar-assets/maya_tiara_v1.png', 140, 'tiara_guardian_pink'),
  ('Armadura Rosa da Maya', 'Armadura do conjunto atual da Maya', 'armadura', 'raro', '/avatar-assets/maya_armor_chest_v1.png', 150, 'armor_guardian_pink'),
  ('Cajado da Maya', 'Cajado dourado com orbe azul', 'arma', 'raro', '/avatar-assets/maya_staff_v1.png', 160, 'staff_guardian_pink')
) AS seed(name, description, category, rarity, image_url, sort_order, equipment_key)
WHERE NOT EXISTS (SELECT 1 FROM public.cosmetic_items WHERE equipment_key = seed.equipment_key);

-- Children who already own Maya receive access to her canonical current set.
INSERT INTO public.child_unlocked_items (child_id, item_id, source)
SELECT unlocked.child_id, item.id, 'maya_v2_current_set'
FROM public.child_unlocked_avatars AS unlocked
JOIN public.avatars AS maya ON maya.id = unlocked.avatar_id AND maya.avatar_key = 'maya'
CROSS JOIN public.cosmetic_items AS item
WHERE item.equipment_key IN ('tiara_guardian_pink','armor_guardian_pink','staff_guardian_pink')
ON CONFLICT (child_id, item_id) DO NOTHING;
