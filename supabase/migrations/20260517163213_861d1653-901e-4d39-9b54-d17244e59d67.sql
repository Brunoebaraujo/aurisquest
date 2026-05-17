CREATE OR REPLACE FUNCTION public.evaluate_cosmetic_unlocks(_child_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _family_id uuid;
  _auris int; _medals int; _best_streak int; _approvals int;
  _starter_avatar uuid;
  _starter_helmet uuid;
  _starter_armor uuid;
  _starter_weapon uuid;
  _starter_pet uuid;
  _starter_aura uuid;
BEGIN
  SELECT family_id INTO _family_id FROM public.children WHERE id = _child_id;

  SELECT COALESCE(SUM(reward_auris),0) INTO _auris FROM public.submissions WHERE child_id=_child_id AND status='aprovado';
  SELECT COUNT(*) INTO _medals FROM public.mission_awards WHERE child_id=_child_id;
  SELECT COUNT(*) INTO _approvals FROM public.submissions WHERE child_id=_child_id AND status='aprovado';
  SELECT COALESCE(MAX(public.compute_streak(_child_id, a.id)),0) INTO _best_streak
    FROM public.activities a
    WHERE a.family_id = _family_id AND a.active=true;

  -- AVATARS
  INSERT INTO public.child_unlocked_avatars (child_id, avatar_id, source)
  SELECT _child_id, a.id, a.unlock_rule_type::text
  FROM public.avatars a
  WHERE a.active = true
    AND (a.scope_type = 'global'
         OR (a.scope_type = 'family' AND a.scope_id = _family_id)
         OR (a.scope_type = 'child'  AND a.scope_id = _child_id))
    AND (a.starts_at IS NULL OR a.starts_at <= now())
    AND (a.ends_at   IS NULL OR a.ends_at   >  now())
    AND (
      a.unlock_rule_type = 'starter'
      OR (a.unlock_rule_type = 'auris_total' AND _auris      >= a.unlock_threshold)
      OR (a.unlock_rule_type = 'medalhas'    AND _medals     >= a.unlock_threshold)
      OR (a.unlock_rule_type = 'streak'      AND _best_streak>= a.unlock_threshold)
      OR (a.unlock_rule_type = 'aprovacoes'  AND _approvals  >= a.unlock_threshold)
      OR (a.unlock_rule_type = 'atividade'   AND a.unlock_condition_value ? 'activity_id'
            AND (SELECT COUNT(*) FROM public.submissions s
                 WHERE s.child_id=_child_id AND s.status='aprovado'
                   AND s.activity_id = (a.unlock_condition_value->>'activity_id')::uuid
                ) >= a.unlock_threshold)
      OR (a.unlock_rule_type = 'categoria'   AND a.unlock_condition_value ? 'category'
            AND (SELECT COUNT(*) FROM public.submissions s
                 JOIN public.activities act ON act.id = s.activity_id
                 WHERE s.child_id=_child_id AND s.status='aprovado'
                   AND act.category = a.unlock_condition_value->>'category'
                ) >= a.unlock_threshold)
      OR (a.unlock_rule_type = 'missao_grupo' AND EXISTS (
            SELECT 1 FROM public.shared_mission_awards sma
            WHERE sma.child_id = _child_id
              AND (NOT (a.unlock_condition_value ? 'shared_mission_id')
                   OR sma.mission_id = (a.unlock_condition_value->>'shared_mission_id')::uuid)
          ))
    )
  ON CONFLICT DO NOTHING;

  -- ITEMS
  INSERT INTO public.child_unlocked_items (child_id, item_id, source)
  SELECT _child_id, i.id, i.unlock_rule_type::text
  FROM public.cosmetic_items i
  WHERE i.active = true
    AND (i.scope_type = 'global'
         OR (i.scope_type = 'family' AND i.scope_id = _family_id)
         OR (i.scope_type = 'child'  AND i.scope_id = _child_id))
    AND (i.starts_at IS NULL OR i.starts_at <= now())
    AND (i.ends_at   IS NULL OR i.ends_at   >  now())
    AND (
      i.unlock_rule_type = 'starter'
      OR (i.unlock_rule_type = 'auris_total' AND _auris      >= i.unlock_threshold)
      OR (i.unlock_rule_type = 'medalhas'    AND _medals     >= i.unlock_threshold)
      OR (i.unlock_rule_type = 'streak'      AND _best_streak>= i.unlock_threshold)
      OR (i.unlock_rule_type = 'aprovacoes'  AND _approvals  >= i.unlock_threshold)
      OR (i.unlock_rule_type = 'atividade'   AND i.unlock_condition_value ? 'activity_id'
            AND (SELECT COUNT(*) FROM public.submissions s
                 WHERE s.child_id=_child_id AND s.status='aprovado'
                   AND s.activity_id = (i.unlock_condition_value->>'activity_id')::uuid
                ) >= i.unlock_threshold)
      OR (i.unlock_rule_type = 'categoria'   AND i.unlock_condition_value ? 'category'
            AND (SELECT COUNT(*) FROM public.submissions s
                 JOIN public.activities act ON act.id = s.activity_id
                 WHERE s.child_id=_child_id AND s.status='aprovado'
                   AND act.category = i.unlock_condition_value->>'category'
                ) >= i.unlock_threshold)
      OR (i.unlock_rule_type = 'missao_grupo' AND EXISTS (
            SELECT 1 FROM public.shared_mission_awards sma
            WHERE sma.child_id = _child_id
              AND (NOT (i.unlock_condition_value ? 'shared_mission_id')
                   OR sma.mission_id = (i.unlock_condition_value->>'shared_mission_id')::uuid)
          ))
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

-- Also re-trigger evaluation when a shared mission award is granted
CREATE OR REPLACE FUNCTION public.trg_eval_unlocks_shared_award()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.child_id IS NOT NULL THEN
    PERFORM public.evaluate_cosmetic_unlocks(NEW.child_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_shared_mission_award_eval_unlocks ON public.shared_mission_awards;
CREATE TRIGGER trg_shared_mission_award_eval_unlocks
AFTER INSERT ON public.shared_mission_awards
FOR EACH ROW EXECUTE FUNCTION public.trg_eval_unlocks_shared_award();