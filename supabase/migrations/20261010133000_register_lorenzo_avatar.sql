-- Make Lorenzo available as a common starter avatar, preserving all existing selections.
-- Keep this migration idempotent for environments that already have a Lorenzo record.
WITH candidate AS (
  SELECT id FROM public.avatars
  WHERE avatar_key IS NULL
    AND (lower(name) = 'lorenzo' OR image_url ILIKE '%lorenzo_avatar_base%')
  ORDER BY active DESC, sort_order, id LIMIT 1
)
UPDATE public.avatars AS a SET avatar_key = 'lorenzo'
FROM candidate WHERE a.id = candidate.id
  AND NOT EXISTS (SELECT 1 FROM public.avatars WHERE avatar_key = 'lorenzo');

INSERT INTO public.avatars (
  name, description, category, image_url, rarity,
  unlock_rule_type, unlock_threshold, sort_order, active, avatar_key
)
SELECT 'Lorenzo', 'Avatar base modular do Lorenzo', 'humano',
  '/avatar-assets/lorenzo_avatar_base_v1.png', 'comum',
  'starter', 0, 4, true, 'lorenzo'
WHERE NOT EXISTS (SELECT 1 FROM public.avatars WHERE avatar_key = 'lorenzo');

UPDATE public.avatars SET
  name = 'Lorenzo',
  description = 'Avatar base modular do Lorenzo',
  category = 'humano',
  image_url = '/avatar-assets/lorenzo_avatar_base_v1.png',
  rarity = 'comum',
  unlock_rule_type = 'starter',
  unlock_threshold = 0,
  active = true
WHERE avatar_key = 'lorenzo';

-- Existing children receive the new starter option, but their equipped avatar is untouched.
INSERT INTO public.child_unlocked_avatars (child_id, avatar_id, source)
SELECT child.id, avatar.id, 'starter'
FROM public.children AS child
CROSS JOIN public.avatars AS avatar
WHERE avatar.avatar_key = 'lorenzo' AND avatar.active = true
ON CONFLICT (child_id, avatar_id) DO NOTHING;
