
ALTER TABLE public.families      ADD COLUMN IF NOT EXISTS auris_per_real INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.activities    ADD COLUMN IF NOT EXISTS reward_auris   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.submissions   ADD COLUMN IF NOT EXISTS reward_auris   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.missions      ADD COLUMN IF NOT EXISTS bonus_auris    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.mission_awards ADD COLUMN IF NOT EXISTS bonus_auris   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.payments      ADD COLUMN IF NOT EXISTS auris_redeemed INTEGER NOT NULL DEFAULT 0;

UPDATE public.activities  SET reward_auris = GREATEST(1, ROUND(reward_amount_cents/100.0))::int WHERE reward_amount_cents > 0 AND reward_auris = 0;
UPDATE public.submissions SET reward_auris = GREATEST(0, ROUND(reward_amount_cents/100.0))::int WHERE reward_auris = 0;
UPDATE public.missions    SET bonus_auris  = ROUND(bonus_amount_cents/100.0)::int WHERE bonus_auris = 0;
UPDATE public.mission_awards SET bonus_auris = ROUND(bonus_amount_cents/100.0)::int WHERE bonus_auris = 0;
UPDATE public.payments    SET auris_redeemed = ROUND(amount_cents/100.0)::int WHERE auris_redeemed = 0 AND amount_cents > 0;

CREATE OR REPLACE FUNCTION public.evaluate_missions_for_submission()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE m RECORD; total INTEGER; streak INTEGER; achieved BOOLEAN;
BEGIN
  IF NEW.status <> 'aprovado' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'aprovado' THEN RETURN NEW; END IF;
  FOR m IN
    SELECT mi.* FROM public.missions mi
    JOIN public.mission_participants mp ON mp.mission_id = mi.id AND mp.child_id = NEW.child_id
    LEFT JOIN public.mission_awards ma ON ma.mission_id = mi.id AND ma.child_id = NEW.child_id
    WHERE mi.family_id = NEW.family_id AND mi.activity_id = NEW.activity_id
      AND mi.active = TRUE AND ma.id IS NULL
  LOOP
    achieved := FALSE;
    IF m.goal_type = 'total' THEN
      SELECT COUNT(*) INTO total FROM public.submissions
        WHERE child_id = NEW.child_id AND activity_id = m.activity_id AND status = 'aprovado';
      IF total >= m.goal_target THEN achieved := TRUE; END IF;
    ELSIF m.goal_type = 'streak' THEN
      streak := public.compute_streak(NEW.child_id, m.activity_id);
      IF streak >= m.goal_target THEN achieved := TRUE; END IF;
    END IF;
    IF achieved THEN
      INSERT INTO public.mission_awards (mission_id, child_id, family_id, bonus_amount_cents, bonus_auris)
      VALUES (m.id, NEW.child_id, NEW.family_id, m.bonus_amount_cents, m.bonus_auris)
      ON CONFLICT DO NOTHING;
      IF COALESCE(m.bonus_auris, 0) > 0 THEN
        INSERT INTO public.submissions
          (family_id, child_id, activity_id, status, reward_amount_cents, reward_auris, completed_at, submitted_at, reviewed_at, reviewed_by, review_note)
        VALUES (NEW.family_id, NEW.child_id, m.activity_id, 'aprovado', m.bonus_amount_cents, m.bonus_auris, now(), now(), now(), NEW.reviewed_by, 'Bônus de missão: ' || m.name);
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS evaluate_missions_after_submission ON public.submissions;
CREATE TRIGGER evaluate_missions_after_submission
AFTER INSERT OR UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.evaluate_missions_for_submission();

CREATE OR REPLACE FUNCTION public.get_child_dashboard(_token text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _child_id UUID; _family_id UUID; _result JSONB;
BEGIN
  SELECT v.child_id, v.family_id INTO _child_id, _family_id FROM public.validate_child_token(_token) v;
  IF _child_id IS NULL THEN RAISE EXCEPTION 'invalid_token'; END IF;
  SELECT jsonb_build_object(
    'child', (SELECT jsonb_build_object('id', id, 'name', name, 'avatar_url', avatar_url) FROM public.children WHERE id = _child_id),
    'family', (SELECT jsonb_build_object('id', id, 'name', name, 'auris_per_real', auris_per_real) FROM public.families WHERE id = _family_id),
    'activities', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'description', description, 'reward_auris', reward_auris,
      'category', category, 'frequency_hint', frequency_hint)), '[]'::jsonb)
      FROM public.activities WHERE family_id = _family_id AND active = TRUE),
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

-- Grupos compartilhados
DO $$ BEGIN CREATE TYPE public.group_type AS ENUM ('familia_estendida','escola','condominio','outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.shared_mission_mode AS ENUM ('coletiva','individual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.shared_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.group_type NOT NULL DEFAULT 'outro',
  description TEXT,
  owner_user_id UUID NOT NULL,
  owner_family_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shared_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.shared_groups(id) ON DELETE CASCADE,
  family_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, family_id)
);

CREATE TABLE IF NOT EXISTS public.shared_group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.shared_groups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID
);

CREATE TABLE IF NOT EXISTS public.shared_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.shared_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  activity_name TEXT NOT NULL,
  mode public.shared_mission_mode NOT NULL,
  goal_type public.mission_goal_type NOT NULL,
  goal_target INTEGER NOT NULL,
  bonus_auris INTEGER NOT NULL DEFAULT 0,
  medal_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shared_mission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.shared_missions(id) ON DELETE CASCADE,
  child_id UUID NOT NULL,
  family_id UUID NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS public.shared_mission_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.shared_missions(id) ON DELETE CASCADE,
  child_id UUID,
  family_id UUID,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  bonus_auris INTEGER NOT NULL DEFAULT 0,
  UNIQUE (mission_id, child_id)
);

ALTER TABLE public.shared_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_mission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_mission_awards ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_uid uuid, _group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shared_groups g WHERE g.id = _group_id AND g.owner_user_id = _uid)
  OR EXISTS (SELECT 1 FROM public.shared_group_members m
    WHERE m.group_id = _group_id AND m.family_id = public.get_user_family_id(_uid));
$$;

CREATE POLICY "Membros veem o grupo" ON public.shared_groups FOR SELECT TO authenticated USING (public.is_group_member(auth.uid(), id));
CREATE POLICY "Cria seu grupo" ON public.shared_groups FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid() AND owner_family_id = public.get_user_family_id(auth.uid()));
CREATE POLICY "Dono atualiza grupo" ON public.shared_groups FOR UPDATE TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "Dono apaga grupo" ON public.shared_groups FOR DELETE TO authenticated USING (owner_user_id = auth.uid());

CREATE POLICY "Membros veem membros" ON public.shared_group_members FOR SELECT TO authenticated USING (public.is_group_member(auth.uid(), group_id));
CREATE POLICY "Dono adiciona membro" ON public.shared_group_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.shared_groups g WHERE g.id = group_id AND g.owner_user_id = auth.uid()));
CREATE POLICY "Dono remove membro" ON public.shared_group_members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.shared_groups g WHERE g.id = group_id AND g.owner_user_id = auth.uid()));

CREATE POLICY "Dono ve convites" ON public.shared_group_invitations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.shared_groups g WHERE g.id = group_id AND g.owner_user_id = auth.uid()));
CREATE POLICY "Dono cria convites" ON public.shared_group_invitations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.shared_groups g WHERE g.id = group_id AND g.owner_user_id = auth.uid()));
CREATE POLICY "Dono atualiza convites" ON public.shared_group_invitations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.shared_groups g WHERE g.id = group_id AND g.owner_user_id = auth.uid()));
CREATE POLICY "Dono apaga convites" ON public.shared_group_invitations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.shared_groups g WHERE g.id = group_id AND g.owner_user_id = auth.uid()));

CREATE POLICY "Membros veem missoes" ON public.shared_missions FOR SELECT TO authenticated USING (public.is_group_member(auth.uid(), group_id));
CREATE POLICY "Dono cria missao" ON public.shared_missions FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.shared_groups g WHERE g.id = group_id AND g.owner_user_id = auth.uid()));
CREATE POLICY "Dono atualiza missao" ON public.shared_missions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.shared_groups g WHERE g.id = group_id AND g.owner_user_id = auth.uid()));
CREATE POLICY "Dono apaga missao" ON public.shared_missions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.shared_groups g WHERE g.id = group_id AND g.owner_user_id = auth.uid()));

CREATE POLICY "Membros veem registros" ON public.shared_mission_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.shared_missions m WHERE m.id = mission_id AND public.is_group_member(auth.uid(), m.group_id)));
CREATE POLICY "Responsavel registra propria crianca" ON public.shared_mission_logs FOR INSERT TO authenticated WITH CHECK (
  family_id = public.get_user_family_id(auth.uid())
  AND approved_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.family_id = family_id)
  AND EXISTS (SELECT 1 FROM public.shared_missions m JOIN public.shared_group_members sgm ON sgm.group_id = m.group_id WHERE m.id = mission_id AND sgm.family_id = family_id)
);
CREATE POLICY "Responsavel apaga propria crianca" ON public.shared_mission_logs FOR DELETE TO authenticated USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Membros veem conquistas" ON public.shared_mission_awards FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.shared_missions m WHERE m.id = mission_id AND public.is_group_member(auth.uid(), m.group_id)));

CREATE OR REPLACE FUNCTION public.evaluate_shared_mission_after_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m RECORD; child_progress INTEGER; child_streak INTEGER;
  total_progress INTEGER; contributors_count INTEGER; per_child INTEGER;
  contributor RECORD; fallback_activity_id UUID;
BEGIN
  SELECT * INTO m FROM public.shared_missions WHERE id = NEW.mission_id;
  IF NOT FOUND OR NOT m.active THEN RETURN NEW; END IF;

  IF m.mode = 'individual' THEN
    IF EXISTS (SELECT 1 FROM public.shared_mission_awards WHERE mission_id = m.id AND child_id = NEW.child_id) THEN
      RETURN NEW;
    END IF;
    IF m.goal_type = 'total' THEN
      SELECT COUNT(*) INTO child_progress FROM public.shared_mission_logs WHERE mission_id = m.id AND child_id = NEW.child_id;
      IF child_progress < m.goal_target THEN RETURN NEW; END IF;
    ELSE
      SELECT COUNT(*) INTO child_streak FROM (
        WITH days AS (SELECT DISTINCT (logged_at AT TIME ZONE 'America/Sao_Paulo')::date AS d
                      FROM public.shared_mission_logs WHERE mission_id = m.id AND child_id = NEW.child_id),
        ranked AS (SELECT d, ROW_NUMBER() OVER (ORDER BY d DESC) AS rn FROM days)
        SELECT 1 FROM ranked WHERE d = ((now() AT TIME ZONE 'America/Sao_Paulo')::date - (rn - 1) * INTERVAL '1 day')::date
      ) s;
      IF COALESCE(child_streak,0) < m.goal_target THEN RETURN NEW; END IF;
    END IF;
    INSERT INTO public.shared_mission_awards (mission_id, child_id, family_id, bonus_auris)
    VALUES (m.id, NEW.child_id, NEW.family_id, m.bonus_auris) ON CONFLICT DO NOTHING;
    IF m.bonus_auris > 0 THEN
      SELECT id INTO fallback_activity_id FROM public.activities WHERE family_id = NEW.family_id ORDER BY created_at LIMIT 1;
      IF fallback_activity_id IS NOT NULL THEN
        INSERT INTO public.submissions (family_id, child_id, activity_id, status, reward_amount_cents, reward_auris, completed_at, submitted_at, reviewed_at, reviewed_by, review_note)
        VALUES (NEW.family_id, NEW.child_id, fallback_activity_id, 'aprovado', 0, m.bonus_auris, now(), now(), now(), NEW.approved_by, 'Bônus de missão compartilhada: ' || m.name);
      END IF;
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.shared_mission_awards WHERE mission_id = m.id AND child_id IS NULL) THEN RETURN NEW; END IF;
    IF m.goal_type <> 'total' THEN RETURN NEW; END IF;
    SELECT COUNT(*) INTO total_progress FROM public.shared_mission_logs WHERE mission_id = m.id;
    IF total_progress < m.goal_target THEN RETURN NEW; END IF;
    INSERT INTO public.shared_mission_awards (mission_id, child_id, family_id, bonus_auris)
    VALUES (m.id, NULL, NULL, m.bonus_auris) ON CONFLICT DO NOTHING;
    IF m.bonus_auris > 0 THEN
      SELECT COUNT(DISTINCT child_id) INTO contributors_count FROM public.shared_mission_logs WHERE mission_id = m.id;
      IF contributors_count > 0 THEN
        per_child := GREATEST(1, m.bonus_auris / contributors_count);
        FOR contributor IN SELECT DISTINCT child_id, family_id FROM public.shared_mission_logs WHERE mission_id = m.id LOOP
          SELECT id INTO fallback_activity_id FROM public.activities WHERE family_id = contributor.family_id ORDER BY created_at LIMIT 1;
          IF fallback_activity_id IS NOT NULL THEN
            INSERT INTO public.submissions (family_id, child_id, activity_id, status, reward_amount_cents, reward_auris, completed_at, submitted_at, reviewed_at, reviewed_by, review_note)
            VALUES (contributor.family_id, contributor.child_id, fallback_activity_id, 'aprovado', 0, per_child, now(), now(), now(), NEW.approved_by, 'Bônus de missão coletiva: ' || m.name);
          END IF;
        END LOOP;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evaluate_shared_mission ON public.shared_mission_logs;
CREATE TRIGGER evaluate_shared_mission AFTER INSERT ON public.shared_mission_logs
FOR EACH ROW EXECUTE FUNCTION public.evaluate_shared_mission_after_log();

CREATE OR REPLACE FUNCTION public.get_shared_group_invitation(_token text)
RETURNS TABLE(group_id uuid, group_name text, email text, status text, expires_at timestamptz, is_valid boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.group_id, g.name, i.email, i.status, i.expires_at,
    (i.status = 'pendente' AND i.expires_at > now()) AS is_valid
  FROM public.shared_group_invitations i JOIN public.shared_groups g ON g.id = i.group_id
  WHERE i.token = _token LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.accept_shared_group_invitation(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv RECORD; _uid UUID := auth.uid(); _fid UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _inv FROM public.shared_group_invitations WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF _inv.status <> 'pendente' THEN RAISE EXCEPTION 'invitation_used'; END IF;
  IF _inv.expires_at <= now() THEN
    UPDATE public.shared_group_invitations SET status = 'expirado' WHERE id = _inv.id;
    RAISE EXCEPTION 'invitation_expired';
  END IF;
  _fid := public.get_user_family_id(_uid);
  IF _fid IS NULL THEN RAISE EXCEPTION 'no_family'; END IF;
  INSERT INTO public.shared_group_members (group_id, family_id) VALUES (_inv.group_id, _fid) ON CONFLICT DO NOTHING;
  UPDATE public.shared_group_invitations SET status = 'aceito', accepted_at = now(), accepted_by = _uid WHERE id = _inv.id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'parent') ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('group_id', _inv.group_id);
END;
$$;
