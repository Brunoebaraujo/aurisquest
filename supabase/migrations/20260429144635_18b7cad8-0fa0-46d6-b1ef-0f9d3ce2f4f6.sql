-- Bucket público para medalhas
INSERT INTO storage.buckets (id, name, public) VALUES ('medals', 'medals', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas do bucket medals
CREATE POLICY "Medalhas públicas" ON storage.objects FOR SELECT USING (bucket_id = 'medals');
CREATE POLICY "Responsáveis enviam medalhas" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'medals');
CREATE POLICY "Responsáveis atualizam medalhas" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'medals');
CREATE POLICY "Responsáveis apagam medalhas" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'medals');

-- Tipo de meta
CREATE TYPE public.mission_goal_type AS ENUM ('total', 'streak');

-- Missões
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal_type public.mission_goal_type NOT NULL,
  goal_target INTEGER NOT NULL CHECK (goal_target > 0),
  bonus_amount_cents INTEGER NOT NULL DEFAULT 0,
  medal_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_missions_family ON public.missions(family_id);
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver missões da família" ON public.missions FOR SELECT TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));
CREATE POLICY "Criar missão na família" ON public.missions FOR INSERT TO authenticated
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()));
CREATE POLICY "Atualizar missão da família" ON public.missions FOR UPDATE TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));
CREATE POLICY "Apagar missão da família" ON public.missions FOR DELETE TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

-- Participantes (crianças que participam da missão)
CREATE TABLE public.mission_participants (
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  PRIMARY KEY (mission_id, child_id)
);

ALTER TABLE public.mission_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver participantes da família" ON public.mission_participants FOR SELECT TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));
CREATE POLICY "Gerenciar participantes da família" ON public.mission_participants FOR ALL TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()))
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()));

-- Conquistas (medalhas concedidas)
CREATE TABLE public.mission_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  bonus_amount_cents INTEGER NOT NULL DEFAULT 0,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mission_id, child_id)
);

ALTER TABLE public.mission_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver conquistas da família" ON public.mission_awards FOR SELECT TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));
CREATE POLICY "Acesso público a conquistas" ON public.mission_awards FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Sistema concede conquistas" ON public.mission_awards FOR INSERT TO authenticated
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()));

-- Função: conta sequência atual de dias consecutivos com aprovação para criança+atividade
CREATE OR REPLACE FUNCTION public.compute_streak(_child_id UUID, _activity_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  streak INTEGER := 0;
  cur_day DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  has_day BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.child_id = _child_id
        AND s.activity_id = _activity_id
        AND s.status = 'aprovado'
        AND (s.completed_at AT TIME ZONE 'America/Sao_Paulo')::date = cur_day
    ) INTO has_day;
    IF NOT has_day THEN
      EXIT;
    END IF;
    streak := streak + 1;
    cur_day := cur_day - INTERVAL '1 day';
  END LOOP;
  RETURN streak;
END;
$$;

-- Função: avalia missões da criança quando uma submissão é aprovada
CREATE OR REPLACE FUNCTION public.evaluate_missions_for_submission()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  m RECORD;
  total INTEGER;
  streak INTEGER;
  achieved BOOLEAN;
BEGIN
  IF NEW.status <> 'aprovado' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'aprovado' THEN RETURN NEW; END IF;

  FOR m IN
    SELECT mi.*
    FROM public.missions mi
    JOIN public.mission_participants mp ON mp.mission_id = mi.id AND mp.child_id = NEW.child_id
    LEFT JOIN public.mission_awards ma ON ma.mission_id = mi.id AND ma.child_id = NEW.child_id
    WHERE mi.family_id = NEW.family_id
      AND mi.activity_id = NEW.activity_id
      AND mi.active = TRUE
      AND ma.id IS NULL
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
      INSERT INTO public.mission_awards (mission_id, child_id, family_id, bonus_amount_cents)
      VALUES (m.id, NEW.child_id, NEW.family_id, m.bonus_amount_cents)
      ON CONFLICT DO NOTHING;

      -- Se há bônus, registra como uma submissão "atividade especial" aprovada para entrar no saldo
      IF m.bonus_amount_cents > 0 THEN
        INSERT INTO public.submissions
          (family_id, child_id, activity_id, status, reward_amount_cents, completed_at, submitted_at, reviewed_at, reviewed_by, review_note)
        VALUES
          (NEW.family_id, NEW.child_id, m.activity_id, 'aprovado', m.bonus_amount_cents, now(), now(), now(), NEW.reviewed_by, 'Bônus de missão: ' || m.name);
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evaluate_missions_insert
AFTER INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.evaluate_missions_for_submission();

CREATE TRIGGER trg_evaluate_missions_update
AFTER UPDATE OF status ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.evaluate_missions_for_submission();