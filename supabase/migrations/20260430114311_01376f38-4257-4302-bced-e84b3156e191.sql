CREATE OR REPLACE FUNCTION public.get_child_dashboard(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _child_id UUID;
  _family_id UUID;
  _result JSONB;
BEGIN
  SELECT v.child_id, v.family_id INTO _child_id, _family_id
  FROM public.validate_child_token(_token) v;

  IF _child_id IS NULL THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  SELECT jsonb_build_object(
    'child', (SELECT jsonb_build_object('id', id, 'name', name, 'avatar_url', avatar_url)
              FROM public.children WHERE id = _child_id),
    'activities', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                      'id', id, 'name', name, 'description', description,
                      'reward_amount_cents', reward_amount_cents, 'category', category,
                      'frequency_hint', frequency_hint
                    )), '[]'::jsonb)
                   FROM public.activities
                   WHERE family_id = _family_id AND active = TRUE),
    'submissions', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                       'id', id, 'activity_id', activity_id, 'status', status,
                       'completed_at', completed_at, 'reward_amount_cents', reward_amount_cents
                     ) ORDER BY completed_at DESC), '[]'::jsonb)
                    FROM (SELECT * FROM public.submissions
                          WHERE child_id = _child_id
                          ORDER BY completed_at DESC LIMIT 50) s),
    'awards', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                  'id', ma.id, 'mission_id', ma.mission_id,
                  'mission_name', m.name, 'medal_url', m.medal_url,
                  'awarded_at', ma.awarded_at
                )), '[]'::jsonb)
               FROM public.mission_awards ma
               JOIN public.missions m ON m.id = ma.mission_id
               WHERE ma.child_id = _child_id),
    'family_children', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                          'id', id, 'name', name, 'avatar_url', avatar_url
                        ) ORDER BY name), '[]'::jsonb)
                        FROM public.children
                        WHERE family_id = _family_id AND active = TRUE),
    'family_submissions', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                              'id', id, 'child_id', child_id, 'activity_id', activity_id,
                              'status', status, 'completed_at', completed_at,
                              'reward_amount_cents', reward_amount_cents
                            )), '[]'::jsonb)
                           FROM public.submissions
                           WHERE family_id = _family_id
                             AND completed_at >= (now() - INTERVAL '90 days')),
    'totals', (SELECT jsonb_build_object(
                  'pending_cents', COALESCE(SUM(CASE WHEN status = 'pendente' THEN reward_amount_cents ELSE 0 END), 0),
                  'approved_cents', COALESCE(SUM(CASE WHEN status = 'aprovado' THEN reward_amount_cents ELSE 0 END), 0)
                ) FROM public.submissions WHERE child_id = _child_id),
    'paid_cents', (SELECT COALESCE(SUM(amount_cents), 0) FROM public.payments WHERE child_id = _child_id),
    'ranking', (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'approved_count')::int DESC, (r->>'earned_cents')::int DESC), '[]'::jsonb)
                FROM (
                  SELECT jsonb_build_object(
                    'child_id', c.id,
                    'name', c.name,
                    'avatar_url', c.avatar_url,
                    'approved_count', COALESCE(SUM(CASE WHEN s.status = 'aprovado' THEN 1 ELSE 0 END), 0),
                    'earned_cents', COALESCE(SUM(CASE WHEN s.status = 'aprovado' THEN s.reward_amount_cents ELSE 0 END), 0),
                    'pending_count', COALESCE(SUM(CASE WHEN s.status = 'pendente' THEN 1 ELSE 0 END), 0),
                    'medals_count', (SELECT COUNT(*) FROM public.mission_awards ma WHERE ma.child_id = c.id)
                  ) AS r
                  FROM public.children c
                  LEFT JOIN public.submissions s ON s.child_id = c.id
                  WHERE c.family_id = _family_id AND c.active = TRUE
                  GROUP BY c.id, c.name, c.avatar_url
                ) sub),
    'missions', (
      SELECT COALESCE(jsonb_agg(mrow ORDER BY mission_name), '[]'::jsonb)
      FROM (
        SELECT
          jsonb_build_object(
            'id', m.id,
            'name', m.name,
            'description', m.description,
            'goal_type', m.goal_type,
            'goal_target', m.goal_target,
            'bonus_amount_cents', m.bonus_amount_cents,
            'activity_id', m.activity_id,
            'activity_name', a.name,
            'medal_url', m.medal_url,
            'participants', (
              SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'child_id', c.id,
                'name', c.name,
                'avatar_url', c.avatar_url,
                'progress', CASE
                  WHEN m.goal_type = 'total' THEN
                    (SELECT COUNT(*) FROM public.submissions s
                     WHERE s.child_id = c.id AND s.activity_id = m.activity_id AND s.status = 'aprovado')
                  WHEN m.goal_type = 'streak' THEN
                    public.compute_streak(c.id, m.activity_id)
                  ELSE 0
                END,
                'achieved', EXISTS (
                  SELECT 1 FROM public.mission_awards ma
                  WHERE ma.mission_id = m.id AND ma.child_id = c.id
                )
              ) ORDER BY c.name), '[]'::jsonb)
              FROM public.mission_participants mp
              JOIN public.children c ON c.id = mp.child_id
              WHERE mp.mission_id = m.id AND c.active = TRUE
            )
          ) AS mrow,
          m.name AS mission_name
        FROM public.missions m
        LEFT JOIN public.activities a ON a.id = m.activity_id
        WHERE m.family_id = _family_id
          AND m.active = TRUE
          AND EXISTS (
            SELECT 1 FROM public.mission_participants mp
            WHERE mp.mission_id = m.id AND mp.child_id = _child_id
          )
      ) ms
    )
  ) INTO _result;

  RETURN _result;
END;
$function$;