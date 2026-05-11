
-- 1. Enum de tiers
CREATE TYPE public.activity_tier AS ENUM ('rotina','responsabilidade','desafio');

-- 2. Colunas em activities
ALTER TABLE public.activities
  ADD COLUMN tier public.activity_tier NOT NULL DEFAULT 'rotina',
  ADD COLUMN icon_key text,
  ADD COLUMN icon_url text;

-- 3. Auto-mapear existentes pelo reward_auris atual
UPDATE public.activities SET tier = 'rotina' WHERE reward_auris <= 1;
UPDATE public.activities SET tier = 'responsabilidade' WHERE reward_auris BETWEEN 2 AND 3;
UPDATE public.activities SET tier = 'desafio' WHERE reward_auris >= 4;

-- 4. Normalizar reward_auris ao valor canônico do tier
UPDATE public.activities SET reward_auris = CASE tier
  WHEN 'rotina' THEN 1
  WHEN 'responsabilidade' THEN 3
  WHEN 'desafio' THEN 5
END;

-- 5. Trigger: reward_auris é sempre derivado do tier (fonte única)
CREATE OR REPLACE FUNCTION public.enforce_activity_tier_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.reward_auris := CASE NEW.tier
    WHEN 'rotina' THEN 1
    WHEN 'responsabilidade' THEN 3
    WHEN 'desafio' THEN 5
  END;
  NEW.reward_amount_cents := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_activity_tier_reward ON public.activities;
CREATE TRIGGER trg_enforce_activity_tier_reward
BEFORE INSERT OR UPDATE OF tier, reward_auris ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.enforce_activity_tier_reward();

-- 6. Atualizar get_child_dashboard para retornar tier, icon_key, icon_url e streak por atividade
CREATE OR REPLACE FUNCTION public.get_child_dashboard(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _child_id UUID; _family_id UUID; _result JSONB;
BEGIN
  SELECT v.child_id, v.family_id INTO _child_id, _family_id FROM public.validate_child_token(_token) v;
  IF _child_id IS NULL THEN RAISE EXCEPTION 'invalid_token'; END IF;
  SELECT jsonb_build_object(
    'child', (SELECT jsonb_build_object('id', id, 'name', name, 'avatar_url', avatar_url) FROM public.children WHERE id = _child_id),
    'family', (SELECT jsonb_build_object('id', id, 'name', name, 'auris_per_real', auris_per_real) FROM public.families WHERE id = _family_id),
    'activities', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id, 'name', a.name, 'description', a.description, 'reward_auris', a.reward_auris,
      'category', a.category, 'frequency_hint', a.frequency_hint,
      'tier', a.tier, 'icon_key', a.icon_key, 'icon_url', a.icon_url,
      'streak', public.compute_streak(_child_id, a.id))), '[]'::jsonb)
      FROM public.activities a WHERE a.family_id = _family_id AND a.active = TRUE),
    'submissions', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'activity_id', activity_id, 'status', status,
      'completed_at', completed_at, 'reward_auris', reward_auris) ORDER BY completed_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.submissions WHERE child_id = _child_id ORDER BY completed_at DESC LIMIT 50) s),
    'awards', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ma.id, 'mission_id', ma.mission_id, 'mission_name', m.name,
      'medal_url', m.medal_url, 'awarded_at', ma.awarded_at)), '[]'::jsonb)
      FROM public.mission_awards ma JOIN public.missions m ON m.id = ma.mission_id WHERE ma.child_id = _child_id),
    'family_children', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'avatar_url', avatar_url) ORDER BY name), '[]'::jsonb)
      FROM public.children WHERE family_id = _family_id AND active = TRUE),
    'family_submissions', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'child_id', child_id, 'activity_id', activity_id,
      'status', status, 'completed_at', completed_at, 'reward_auris', reward_auris)), '[]'::jsonb)
      FROM public.submissions WHERE family_id = _family_id AND completed_at >= (now() - INTERVAL '90 days')),
    'totals', (SELECT jsonb_build_object(
      'pending_auris', COALESCE(SUM(CASE WHEN status = 'pendente' THEN reward_auris ELSE 0 END), 0),
      'approved_auris', COALESCE(SUM(CASE WHEN status = 'aprovado' THEN reward_auris ELSE 0 END), 0)
    ) FROM public.submissions WHERE child_id = _child_id),
    'paid_auris', (SELECT COALESCE(SUM(auris_redeemed), 0) FROM public.payments WHERE child_id = _child_id),
    'ranking', (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'approved_count')::int DESC, (r->>'earned_auris')::int DESC), '[]'::jsonb)
      FROM (SELECT jsonb_build_object(
        'child_id', c.id, 'name', c.name, 'avatar_url', c.avatar_url,
        'approved_count', COALESCE(SUM(CASE WHEN s.status = 'aprovado' THEN 1 ELSE 0 END), 0),
        'earned_auris', COALESCE(SUM(CASE WHEN s.status = 'aprovado' THEN s.reward_auris ELSE 0 END), 0),
        'pending_count', COALESCE(SUM(CASE WHEN s.status = 'pendente' THEN 1 ELSE 0 END), 0),
        'medals_count', (SELECT COUNT(*) FROM public.mission_awards ma WHERE ma.child_id = c.id)
      ) AS r FROM public.children c
      LEFT JOIN public.submissions s ON s.child_id = c.id
      WHERE c.family_id = _family_id AND c.active = TRUE
      GROUP BY c.id, c.name, c.avatar_url) sub),
    'missions', (SELECT COALESCE(jsonb_agg(mrow ORDER BY mission_name), '[]'::jsonb) FROM (
      SELECT jsonb_build_object(
        'id', m.id, 'name', m.name, 'description', m.description,
        'goal_type', m.goal_type, 'goal_target', m.goal_target,
        'bonus_auris', m.bonus_auris, 'activity_id', m.activity_id,
        'activity_name', a.name, 'medal_url', m.medal_url,
        'participants', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'child_id', c.id, 'name', c.name, 'avatar_url', c.avatar_url,
          'progress', CASE
            WHEN m.goal_type = 'total' THEN (SELECT COUNT(*) FROM public.submissions s WHERE s.child_id = c.id AND s.activity_id = m.activity_id AND s.status = 'aprovado')
            WHEN m.goal_type = 'streak' THEN public.compute_streak(c.id, m.activity_id)
            ELSE 0 END,
          'achieved', EXISTS (SELECT 1 FROM public.mission_awards ma WHERE ma.mission_id = m.id AND ma.child_id = c.id)
        ) ORDER BY c.name), '[]'::jsonb)
        FROM public.mission_participants mp JOIN public.children c ON c.id = mp.child_id
        WHERE mp.mission_id = m.id AND c.active = TRUE)
      ) AS mrow, m.name AS mission_name
      FROM public.missions m LEFT JOIN public.activities a ON a.id = m.activity_id
      WHERE m.family_id = _family_id AND m.active = TRUE
        AND EXISTS (SELECT 1 FROM public.mission_participants mp WHERE mp.mission_id = m.id AND mp.child_id = _child_id)
    ) ms)
  ) INTO _result;
  RETURN _result;
END;
$function$;

-- 7. Bucket público para ícones de atividade customizados
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-icons', 'activity-icons', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Activity icons publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'activity-icons');

CREATE POLICY "Family members upload activity icons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'activity-icons'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = public.get_user_family_id(auth.uid())::text
);

CREATE POLICY "Family members delete own activity icons"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'activity-icons'
  AND (storage.foldername(name))[1] = public.get_user_family_id(auth.uid())::text
);
