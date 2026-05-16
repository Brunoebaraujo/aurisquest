CREATE OR REPLACE FUNCTION public.evaluate_cosmetic_unlocks(_child_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _auris int; _medals int; _best_streak int;
  _starter_avatar uuid;
  _starter_helmet uuid;
  _starter_armor uuid;
  _starter_weapon uuid;
  _starter_pet uuid;
  _starter_aura uuid;
BEGIN
  SELECT COALESCE(SUM(reward_auris),0) INTO _auris FROM public.submissions WHERE child_id=_child_id AND status='aprovado';
  SELECT COUNT(*) INTO _medals FROM public.mission_awards WHERE child_id=_child_id;
  SELECT COALESCE(MAX(public.compute_streak(_child_id, a.id)),0) INTO _best_streak
    FROM public.activities a
    WHERE a.family_id = (SELECT family_id FROM public.children WHERE id=_child_id) AND a.active=true;

  INSERT INTO public.child_unlocked_avatars (child_id, avatar_id, source)
  SELECT _child_id, a.id, a.unlock_rule_type::text FROM public.avatars a WHERE a.active = true AND (
    a.unlock_rule_type = 'starter'
    OR (a.unlock_rule_type='auris_total' AND _auris >= a.unlock_threshold)
    OR (a.unlock_rule_type='medalhas' AND _medals >= a.unlock_threshold)
    OR (a.unlock_rule_type='streak' AND _best_streak >= a.unlock_threshold)
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.child_unlocked_items (child_id, item_id, source)
  SELECT _child_id, i.id, i.unlock_rule_type::text FROM public.cosmetic_items i WHERE i.active = true AND (
    i.unlock_rule_type = 'starter'
    OR (i.unlock_rule_type='auris_total' AND _auris >= i.unlock_threshold)
    OR (i.unlock_rule_type='medalhas' AND _medals >= i.unlock_threshold)
    OR (i.unlock_rule_type='streak' AND _best_streak >= i.unlock_threshold)
  )
  ON CONFLICT DO NOTHING;

  -- Auto-equip starters in empty slots (never overrides user choice)
  INSERT INTO public.child_equipment (child_id) VALUES (_child_id) ON CONFLICT DO NOTHING;

  SELECT id INTO _starter_avatar FROM public.avatars WHERE active AND unlock_rule_type='starter' ORDER BY sort_order, name LIMIT 1;
  SELECT id INTO _starter_helmet FROM public.cosmetic_items WHERE active AND unlock_rule_type='starter' AND category='elmo' ORDER BY sort_order, name LIMIT 1;
  SELECT id INTO _starter_armor  FROM public.cosmetic_items WHERE active AND unlock_rule_type='starter' AND category='armadura' ORDER BY sort_order, name LIMIT 1;
  SELECT id INTO _starter_weapon FROM public.cosmetic_items WHERE active AND unlock_rule_type='starter' AND category='arma' ORDER BY sort_order, name LIMIT 1;
  SELECT id INTO _starter_pet    FROM public.cosmetic_items WHERE active AND unlock_rule_type='starter' AND category='pet' ORDER BY sort_order, name LIMIT 1;
  SELECT id INTO _starter_aura   FROM public.cosmetic_items WHERE active AND unlock_rule_type='starter' AND category='aura' ORDER BY sort_order, name LIMIT 1;

  UPDATE public.child_equipment SET
    avatar_id      = COALESCE(avatar_id,      _starter_avatar),
    helmet_item_id = COALESCE(helmet_item_id, _starter_helmet),
    armor_item_id  = COALESCE(armor_item_id,  _starter_armor),
    weapon_item_id = COALESCE(weapon_item_id, _starter_weapon),
    pet_item_id    = COALESCE(pet_item_id,    _starter_pet),
    aura_item_id   = COALESCE(aura_item_id,   _starter_aura),
    updated_at     = now()
  WHERE child_id = _child_id;
END $function$;

-- Backfill all existing children
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.children LOOP
    PERFORM public.evaluate_cosmetic_unlocks(r.id);
  END LOOP;
END $$;