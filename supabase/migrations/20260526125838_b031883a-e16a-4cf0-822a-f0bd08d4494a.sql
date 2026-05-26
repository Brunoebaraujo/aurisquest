
-- Enum de categorias
DO $$ BEGIN
  CREATE TYPE public.side_quest_category AS ENUM ('bondade', 'criatividade', 'socializacao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.side_quest_status AS ENUM ('pendente', 'concluida', 'expirada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.side_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  child_id uuid NOT NULL,
  created_by uuid NOT NULL,
  category public.side_quest_category NOT NULL,
  mission_key text NOT NULL,
  title text NOT NULL,
  reward_auris int NOT NULL DEFAULT 2 CHECK (reward_auris BETWEEN 1 AND 3),
  parent_comment text,
  status public.side_quest_status NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_side_quests_child_status ON public.side_quests(child_id, status);
CREATE INDEX IF NOT EXISTS idx_side_quests_family ON public.side_quests(family_id);

-- Apenas 1 SideQuest pendente e válida por criança
CREATE UNIQUE INDEX IF NOT EXISTS uniq_side_quests_active_per_child
  ON public.side_quests(child_id)
  WHERE status = 'pendente';

-- Impedir repetir mesma missão concluída
CREATE UNIQUE INDEX IF NOT EXISTS uniq_side_quests_completed_mission
  ON public.side_quests(child_id, mission_key)
  WHERE status = 'concluida';

ALTER TABLE public.side_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Responsavel vê SideQuests da família"
  ON public.side_quests FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Responsavel cria SideQuests da família"
  ON public.side_quests FOR INSERT
  TO authenticated
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Responsavel atualiza SideQuests da família"
  ON public.side_quests FOR UPDATE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Responsavel apaga SideQuests da família"
  ON public.side_quests FOR DELETE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

-- RPC: SideQuest ativa da criança (via token)
CREATE OR REPLACE FUNCTION public.get_child_side_quest(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _child_id uuid; _row public.side_quests;
BEGIN
  SELECT child_id INTO _child_id FROM public.validate_child_token(_token);
  IF _child_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO _row FROM public.side_quests
    WHERE child_id = _child_id AND status = 'pendente' AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'id', _row.id, 'category', _row.category, 'mission_key', _row.mission_key,
    'title', _row.title, 'reward_auris', _row.reward_auris,
    'parent_comment', _row.parent_comment, 'expires_at', _row.expires_at,
    'created_at', _row.created_at
  );
END $$;

-- RPC: Histórico de SideQuests concluídas (via token)
CREATE OR REPLACE FUNCTION public.get_child_side_quest_history(_token text, _limit int DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _child_id uuid; _result jsonb;
BEGIN
  SELECT child_id INTO _child_id FROM public.validate_child_token(_token);
  IF _child_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'category', category, 'mission_key', mission_key, 'title', title,
    'reward_auris', reward_auris, 'parent_comment', parent_comment,
    'completed_at', completed_at
  ) ORDER BY completed_at DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT * FROM public.side_quests
    WHERE child_id = _child_id AND status = 'concluida'
    ORDER BY completed_at DESC LIMIT _limit
  ) s;

  RETURN _result;
END $$;

-- RPC: Concluir SideQuest (via token) e creditar Auris
CREATE OR REPLACE FUNCTION public.complete_side_quest(_token text, _side_quest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _child_id uuid; _family_id uuid; _row public.side_quests; _fallback_activity uuid;
BEGIN
  SELECT v.child_id, v.family_id INTO _child_id, _family_id
    FROM public.validate_child_token(_token) v;
  IF _child_id IS NULL THEN RAISE EXCEPTION 'invalid_token'; END IF;

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
    SET status = 'concluida', completed_at = now()
    WHERE id = _row.id;

  -- Credita Auris criando uma submissão aprovada usando uma atividade da família
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
END $$;
