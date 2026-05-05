
-- ============ admin_usage_overview ============
CREATE OR REPLACE FUNCTION public.admin_usage_overview(
  _from timestamptz,
  _to timestamptz,
  _group_id uuid DEFAULT NULL,
  _family_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _result jsonb;
  _fam_ids uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Filter family ids by group/status
  SELECT array_agg(f.id) INTO _fam_ids
  FROM public.families f
  WHERE (_family_status IS NULL OR f.status = _family_status)
    AND (_group_id IS NULL OR EXISTS (
      SELECT 1 FROM public.shared_group_members m
      WHERE m.group_id = _group_id AND m.family_id = f.id
    ));

  IF _fam_ids IS NULL THEN _fam_ids := ARRAY[]::uuid[]; END IF;

  WITH
  fam AS (SELECT unnest(_fam_ids) AS id),
  subs AS (
    SELECT s.* FROM public.submissions s
    WHERE s.family_id = ANY(_fam_ids)
      AND s.completed_at >= _from AND s.completed_at < _to
  ),
  subs_all AS (
    SELECT s.* FROM public.submissions s WHERE s.family_id = ANY(_fam_ids)
  ),
  globals AS (
    SELECT
      (SELECT COUNT(*) FROM public.families WHERE id = ANY(_fam_ids))::int AS families_total,
      (SELECT COUNT(DISTINCT family_id) FROM subs)::int AS families_active,
      (SELECT COUNT(*) FROM public.profiles WHERE family_id = ANY(_fam_ids))::int AS parents_total,
      (SELECT COUNT(*) FROM public.children WHERE family_id = ANY(_fam_ids))::int AS children_total,
      (SELECT COUNT(DISTINCT child_id) FROM subs)::int AS children_active,
      (SELECT COUNT(*) FROM subs)::int AS submissions_total,
      (SELECT COUNT(*) FROM subs WHERE status='aprovado')::int AS submissions_approved,
      (SELECT COUNT(*) FROM subs WHERE status='recusado')::int AS submissions_rejected,
      (SELECT COUNT(*) FROM subs WHERE status='pendente')::int AS submissions_pending,
      (SELECT EXTRACT(EPOCH FROM AVG(reviewed_at - submitted_at))/3600 FROM subs WHERE reviewed_at IS NOT NULL)::numeric AS avg_approval_hours,
      (SELECT COUNT(*) FROM public.missions WHERE family_id = ANY(_fam_ids) AND created_at < _to)::int AS missions_created,
      (SELECT COUNT(*) FROM public.missions m
        WHERE m.family_id = ANY(_fam_ids) AND m.active = TRUE
          AND NOT EXISTS (SELECT 1 FROM public.mission_awards ma WHERE ma.mission_id = m.id)
      )::int AS missions_in_progress,
      (SELECT COUNT(DISTINCT mission_id) FROM public.mission_awards WHERE family_id = ANY(_fam_ids))::int AS missions_completed,
      (SELECT COUNT(*) FROM public.mission_awards WHERE family_id = ANY(_fam_ids) AND awarded_at >= _from AND awarded_at < _to)::int AS medals_awarded,
      (SELECT COALESCE(SUM(reward_auris),0) FROM subs WHERE status='aprovado')::int AS auris_distributed
  )
  SELECT jsonb_build_object(
    'globals', jsonb_build_object(
      'familiesTotal', g.families_total,
      'familiesActive', g.families_active,
      'parentsTotal', g.parents_total,
      'childrenTotal', g.children_total,
      'childrenActive', g.children_active,
      'submissionsTotal', g.submissions_total,
      'submissionsApproved', g.submissions_approved,
      'submissionsRejected', g.submissions_rejected,
      'submissionsPending', g.submissions_pending,
      'approvalRate', CASE WHEN (g.submissions_approved + g.submissions_rejected) > 0
        THEN round((g.submissions_approved::numeric / (g.submissions_approved + g.submissions_rejected)) * 100, 1)
        ELSE 0 END,
      'avgApprovalHours', COALESCE(round(g.avg_approval_hours, 1), 0),
      'missionsCreated', g.missions_created,
      'missionsInProgress', g.missions_in_progress,
      'missionsCompleted', g.missions_completed,
      'medalsAwarded', g.medals_awarded,
      'aurisDistributed', g.auris_distributed,
      'avgAurisPerActiveChild', CASE WHEN g.children_active > 0
        THEN round(g.auris_distributed::numeric / g.children_active, 1) ELSE 0 END,
      'familiesInactive7d', (
        SELECT COUNT(*) FROM public.families f
        WHERE f.id = ANY(_fam_ids) AND NOT EXISTS (
          SELECT 1 FROM public.submissions s
          WHERE s.family_id = f.id AND s.completed_at >= now() - interval '7 days'
        )
      ),
      'childrenInactive7d', (
        SELECT COUNT(*) FROM public.children c
        WHERE c.family_id = ANY(_fam_ids) AND c.active = TRUE AND NOT EXISTS (
          SELECT 1 FROM public.submissions s
          WHERE s.child_id = c.id AND s.completed_at >= now() - interval '7 days'
        )
      ),
      'weeklyRetention', (
        WITH weeks AS (
          SELECT DISTINCT family_id, date_trunc('week', completed_at) AS wk
          FROM subs_all WHERE completed_at >= _from AND completed_at < _to
        ),
        consecutive AS (
          SELECT a.family_id FROM weeks a JOIN weeks b
            ON a.family_id = b.family_id AND b.wk = a.wk + interval '7 days'
          GROUP BY a.family_id
        ),
        active AS (SELECT DISTINCT family_id FROM weeks)
        SELECT CASE WHEN (SELECT COUNT(*) FROM active) > 0
          THEN round((SELECT COUNT(*) FROM consecutive)::numeric * 100 / (SELECT COUNT(*) FROM active), 1)
          ELSE 0 END
      )
    ),
    'series', jsonb_build_object(
      'submissionsPerDay', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d::date, 'count', cnt) ORDER BY d), '[]'::jsonb)
        FROM (
          SELECT date_trunc('day', completed_at) AS d, COUNT(*)::int AS cnt
          FROM subs GROUP BY 1
        ) x
      ),
      'activeFamiliesPerWeek', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('week', w::date, 'count', cnt) ORDER BY w), '[]'::jsonb)
        FROM (
          SELECT date_trunc('week', completed_at) AS w, COUNT(DISTINCT family_id)::int AS cnt
          FROM subs GROUP BY 1
        ) x
      ),
      'approvedVsRejected', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d::date, 'aprovado', ap, 'recusado', rj) ORDER BY d), '[]'::jsonb)
        FROM (
          SELECT date_trunc('day', completed_at) AS d,
            COUNT(*) FILTER (WHERE status='aprovado')::int AS ap,
            COUNT(*) FILTER (WHERE status='recusado')::int AS rj
          FROM subs GROUP BY 1
        ) x
      ),
      'aurisPerMonth', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('month', m::date, 'auris', auris) ORDER BY m), '[]'::jsonb)
        FROM (
          SELECT date_trunc('month', completed_at) AS m, COALESCE(SUM(reward_auris),0)::int AS auris
          FROM subs_all
          WHERE status='aprovado' AND completed_at >= now() - interval '12 months'
          GROUP BY 1
        ) x
      )
    ),
    'funnel', jsonb_build_object(
      'invited', (SELECT COUNT(*) FROM public.invitations WHERE family_id = ANY(_fam_ids)),
      'activated', (SELECT COUNT(*) FROM public.families WHERE id = ANY(_fam_ids) AND status='ativa'),
      'withChild', (SELECT COUNT(DISTINCT family_id) FROM public.children WHERE family_id = ANY(_fam_ids)),
      'firstSubmission', (SELECT COUNT(DISTINCT family_id) FROM subs_all),
      'firstApproval', (SELECT COUNT(DISTINCT family_id) FROM subs_all WHERE status='aprovado')
    )
  ) INTO _result FROM globals g;

  RETURN _result;
END; $$;

-- ============ admin_usage_families ============
CREATE OR REPLACE FUNCTION public.admin_usage_families(
  _from timestamptz,
  _to timestamptz,
  _group_id uuid DEFAULT NULL,
  _family_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _result jsonb; _days numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  _days := GREATEST(EXTRACT(EPOCH FROM (_to - _from))/86400, 1);

  WITH base AS (
    SELECT f.id, f.name, f.status, f.created_at,
      (SELECT g.name FROM public.shared_groups g
        JOIN public.shared_group_members m ON m.group_id = g.id
        WHERE m.family_id = f.id ORDER BY m.joined_at LIMIT 1) AS group_name
    FROM public.families f
    WHERE (_family_status IS NULL OR f.status = _family_status)
      AND (_group_id IS NULL OR EXISTS (
        SELECT 1 FROM public.shared_group_members m WHERE m.group_id = _group_id AND m.family_id = f.id))
  ),
  agg AS (
    SELECT b.*,
      (SELECT COUNT(*) FROM public.profiles p
         JOIN auth.users u ON u.id = p.id
         WHERE p.family_id = b.id AND u.last_sign_in_at >= now() - interval '30 days')::int AS parents_active,
      (SELECT COUNT(*) FROM public.children WHERE family_id = b.id)::int AS children_count,
      (SELECT COUNT(DISTINCT child_id) FROM public.submissions
         WHERE family_id = b.id AND completed_at >= _from AND completed_at < _to)::int AS children_active,
      (SELECT COUNT(*) FROM public.submissions
         WHERE family_id = b.id AND completed_at >= _from AND completed_at < _to)::int AS submissions_period,
      (SELECT COUNT(*) FROM public.submissions
         WHERE family_id = b.id AND status='pendente')::int AS pending,
      (SELECT COUNT(*) FROM public.missions m
         WHERE m.family_id = b.id AND m.active = TRUE
           AND NOT EXISTS (SELECT 1 FROM public.mission_awards ma WHERE ma.mission_id = m.id))::int AS missions_in_progress,
      (SELECT COUNT(DISTINCT mission_id) FROM public.mission_awards WHERE family_id = b.id)::int AS missions_completed,
      (SELECT COALESCE(SUM(reward_auris),0) FROM public.submissions
         WHERE family_id = b.id AND status='aprovado'
           AND completed_at >= _from AND completed_at < _to)::int AS auris_distributed,
      GREATEST(
        COALESCE((SELECT MAX(completed_at) FROM public.submissions WHERE family_id = b.id), 'epoch'::timestamptz),
        COALESCE((SELECT MAX(paid_at) FROM public.payments WHERE family_id = b.id), 'epoch'::timestamptz),
        COALESCE((SELECT MAX(awarded_at) FROM public.mission_awards WHERE family_id = b.id), 'epoch'::timestamptz)
      ) AS last_activity_at,
      (SELECT EXTRACT(EPOCH FROM AVG(reviewed_at - submitted_at))/3600
         FROM public.submissions WHERE family_id = b.id AND reviewed_at IS NOT NULL)::numeric AS avg_approval_hours
    FROM base b
  ),
  scored AS (
    SELECT a.*,
      LEAST(a.submissions_period::numeric / _days / GREATEST(a.children_count,1) * 30, 1) * 35 AS s_freq,
      (a.children_active::numeric / GREATEST(a.children_count,1)) * 25 AS s_ativ,
      (1 - LEAST(COALESCE(a.avg_approval_hours,72)/72, 1)) * 15 AS s_aprov,
      LEAST((a.missions_in_progress + 2*a.missions_completed)::numeric / 3, 1) * 15 AS s_miss,
      CASE WHEN a.last_activity_at >= now() - interval '7 days' THEN 10 ELSE 0 END AS s_rec
    FROM agg a
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'familyId', s.id,
    'familyName', s.name,
    'groupName', s.group_name,
    'status', s.status,
    'parentsActive', s.parents_active,
    'childrenCount', s.children_count,
    'childrenActive', s.children_active,
    'submissionsPeriod', s.submissions_period,
    'pending', s.pending,
    'missionsInProgress', s.missions_in_progress,
    'missionsCompleted', s.missions_completed,
    'aurisDistributed', s.auris_distributed,
    'lastActivityAt', CASE WHEN s.last_activity_at = 'epoch'::timestamptz THEN NULL ELSE s.last_activity_at END,
    'adherenceScore', round(s.s_freq + s.s_ativ + s.s_aprov + s.s_miss + s.s_rec)
  ) ORDER BY s.last_activity_at DESC), '[]'::jsonb) INTO _result FROM scored s;

  RETURN _result;
END; $$;

-- ============ admin_usage_alerts ============
CREATE OR REPLACE FUNCTION public.admin_usage_alerts()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT jsonb_build_object(
    'inactive7d', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('familyId', f.id, 'familyName', f.name,
        'value', COALESCE((SELECT MAX(completed_at)::text FROM public.submissions WHERE family_id = f.id), 'nunca'))), '[]'::jsonb)
      FROM public.families f
      WHERE f.status='ativa' AND NOT EXISTS (
        SELECT 1 FROM public.submissions s WHERE s.family_id = f.id AND s.completed_at >= now() - interval '7 days')
    ),
    'pendingHeavy', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('familyId', f.id, 'familyName', f.name, 'value', cnt)), '[]'::jsonb)
      FROM (
        SELECT family_id, COUNT(*) AS cnt FROM public.submissions WHERE status='pendente' GROUP BY family_id HAVING COUNT(*) > 10
      ) p JOIN public.families f ON f.id = p.family_id
    ),
    'noChildren', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('familyId', f.id, 'familyName', f.name, 'value', f.created_at::text)), '[]'::jsonb)
      FROM public.families f
      WHERE f.created_at < now() - interval '3 days'
        AND NOT EXISTS (SELECT 1 FROM public.children c WHERE c.family_id = f.id)
    ),
    'noSubmissions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('familyId', f.id, 'familyName', f.name, 'value', MIN(c.created_at)::text)), '[]'::jsonb)
      FROM public.families f
      JOIN public.children c ON c.family_id = f.id
      WHERE c.created_at < now() - interval '7 days'
        AND NOT EXISTS (SELECT 1 FROM public.submissions s WHERE s.family_id = f.id)
      GROUP BY f.id, f.name
    ),
    'staleMissions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('familyId', f.id, 'familyName', f.name, 'value', cnt)), '[]'::jsonb)
      FROM (
        SELECT m.family_id, COUNT(*) AS cnt FROM public.missions m
        WHERE m.active = TRUE AND m.created_at < now() - interval '14 days'
          AND NOT EXISTS (SELECT 1 FROM public.submissions s
            WHERE s.activity_id = m.activity_id AND s.family_id = m.family_id AND s.status='aprovado'
              AND s.completed_at >= m.created_at)
        GROUP BY m.family_id
      ) x JOIN public.families f ON f.id = x.family_id
    )
  ) INTO _result;

  RETURN _result;
END; $$;
