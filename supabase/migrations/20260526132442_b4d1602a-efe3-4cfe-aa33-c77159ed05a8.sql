
ALTER TABLE public.side_quests
  ADD COLUMN IF NOT EXISTS child_comment text,
  ADD COLUMN IF NOT EXISTS child_photo_url text;

-- Atualiza histórico para incluir comentário e foto da criança
CREATE OR REPLACE FUNCTION public.get_child_side_quest_history(_token text, _limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _child_id uuid; _result jsonb;
BEGIN
  SELECT child_id INTO _child_id FROM public.validate_child_token(_token);
  IF _child_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'category', category, 'mission_key', mission_key, 'title', title,
    'reward_auris', reward_auris, 'parent_comment', parent_comment,
    'child_comment', child_comment, 'child_photo_url', child_photo_url,
    'completed_at', completed_at
  ) ORDER BY completed_at DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT * FROM public.side_quests
    WHERE child_id = _child_id AND status = 'concluida'
    ORDER BY completed_at DESC LIMIT _limit
  ) s;

  RETURN _result;
END $function$;

-- Substitui a função de conclusão exigindo prova (comentário OU foto)
DROP FUNCTION IF EXISTS public.complete_side_quest(text, uuid);

CREATE OR REPLACE FUNCTION public.complete_side_quest(
  _token text,
  _side_quest_id uuid,
  _child_comment text DEFAULT NULL,
  _child_photo_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _child_id uuid; _family_id uuid; _row public.side_quests; _fallback_activity uuid;
  _comment text; _photo text;
BEGIN
  SELECT v.child_id, v.family_id INTO _child_id, _family_id
    FROM public.validate_child_token(_token) v;
  IF _child_id IS NULL THEN RAISE EXCEPTION 'invalid_token'; END IF;

  _comment := NULLIF(btrim(COALESCE(_child_comment, '')), '');
  IF _comment IS NOT NULL AND length(_comment) > 120 THEN
    _comment := left(_comment, 120);
  END IF;
  _photo := NULLIF(btrim(COALESCE(_child_photo_url, '')), '');

  IF _comment IS NULL AND _photo IS NULL THEN
    RAISE EXCEPTION 'empty_proof';
  END IF;

  SELECT * INTO _row FROM public.side_quests
    WHERE id = _side_quest_id AND child_id = _child_id
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'side_quest_not_found'; END IF;
  IF _row.status <> 'pendente' THEN RAISE EXCEPTION 'side_quest_not_active'; END IF;
  IF _row.expires_at <= now() THEN
    UPDATE public.side_quests SET status='expirada' WHERE id = _row.id;
    RAISE EXCEPTION 'side_quest_expired';
  END IF;

  UPDATE public.side_quests
    SET status = 'concluida',
        completed_at = now(),
        child_comment = _comment,
        child_photo_url = _photo
    WHERE id = _row.id;

  SELECT id INTO _fallback_activity FROM public.activities
    WHERE family_id = _family_id ORDER BY created_at LIMIT 1;
  IF _fallback_activity IS NOT NULL AND _row.reward_auris > 0 THEN
    INSERT INTO public.submissions
      (family_id, child_id, activity_id, status, reward_amount_cents, reward_auris,
       completed_at, submitted_at, reviewed_at, review_note)
    VALUES (_family_id, _child_id, _fallback_activity, 'aprovado', 0, _row.reward_auris,
       now(), now(), now(), 'SideQuest: ' || _row.title);
  END IF;

  RETURN jsonb_build_object('ok', true, 'reward_auris', _row.reward_auris);
END $function$;

-- Permite upload no bucket 'proofs' também para anônimos (criança sem login Supabase)
DROP POLICY IF EXISTS "Upload de provas autenticado" ON storage.objects;
CREATE POLICY "Upload de provas"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'proofs');
