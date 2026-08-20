-- Children who already own Gael can use the canonical Guardian render parts.
-- This migration only unlocks catalog entries; it does not change their equipped items.
INSERT INTO public.child_unlocked_items (child_id, item_id, source)
SELECT unlocked_gael.child_id, guardian_item.id, 'gael_guardian_kit'
FROM public.child_unlocked_avatars AS unlocked_gael
JOIN public.avatars AS gael
  ON gael.id = unlocked_gael.avatar_id
 AND gael.avatar_key = 'gael'
CROSS JOIN public.cosmetic_items AS guardian_item
WHERE guardian_item.equipment_key IN (
  'helmet_guardian_blue',
  'armor_guardian_blue',
  'sword_guardian_blue',
  'pet_guardian_fox'
)
ON CONFLICT (child_id, item_id) DO NOTHING;
