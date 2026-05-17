-- Returns rewards (avatars + items) unlocked since last seen, for the child resolved by token
CREATE OR REPLACE FUNCTION public.get_child_new_unlocks(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _child_id uuid;
  _last_seen timestamptz;
  _result jsonb;
BEGIN
  SELECT child_id INTO _child_id FROM public.validate_child_token(_token);
  IF _child_id IS NULL THEN
    RETURN jsonb_build_object('rewards', '[]'::jsonb);
  END IF;

  SELECT COALESCE(last_seen_unlocks_at, 'epoch'::timestamptz)
    INTO _last_seen
  FROM public.child_equipment
  WHERE child_id = _child_id;

  IF _last_seen IS NULL THEN _last_seen := 'epoch'::timestamptz; END IF;

  SELECT COALESCE(jsonb_agg(r ORDER BY r->>'unlocked_at'), '[]'::jsonb) INTO _result FROM (
    SELECT jsonb_build_object(
      'kind', 'avatar',
      'id', a.id,
      'name', a.name,
      'description', a.description,
      'image_url', a.image_url,
      'rarity', a.rarity,
      'category', 'avatar',
      'unlocked_at', cu.unlocked_at,
      'source', cu.source
    ) AS r
    FROM public.child_unlocked_avatars cu
    JOIN public.avatars a ON a.id = cu.avatar_id
    WHERE cu.child_id = _child_id AND cu.unlocked_at > _last_seen
    UNION ALL
    SELECT jsonb_build_object(
      'kind', 'item',
      'id', i.id,
      'name', i.name,
      'description', i.description,
      'image_url', i.image_url,
      'rarity', i.rarity,
      'category', i.category,
      'unlocked_at', cu.unlocked_at,
      'source', cu.source
    ) AS r
    FROM public.child_unlocked_items cu
    JOIN public.cosmetic_items i ON i.id = cu.item_id
    WHERE cu.child_id = _child_id AND cu.unlocked_at > _last_seen
  ) x;

  RETURN jsonb_build_object('rewards', _result);
END;
$$;

-- Marks all current unlocks as seen
CREATE OR REPLACE FUNCTION public.mark_child_unlocks_seen(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _child_id uuid;
BEGIN
  SELECT child_id INTO _child_id FROM public.validate_child_token(_token);
  IF _child_id IS NULL THEN RETURN false; END IF;

  UPDATE public.child_equipment
     SET last_seen_unlocks_at = now()
   WHERE child_id = _child_id;

  RETURN true;
END;
$$;