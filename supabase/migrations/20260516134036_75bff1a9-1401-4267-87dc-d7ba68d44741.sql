
-- ============ ENUMS ============
CREATE TYPE public.cosmetic_rarity AS ENUM ('comum','raro','epico','lendario');
CREATE TYPE public.cosmetic_category AS ENUM ('elmo','armadura','arma','pet','aura','moldura','badge');
CREATE TYPE public.avatar_category AS ENUM ('humano','fantastico');
CREATE TYPE public.unlock_rule_type AS ENUM ('starter','auris_total','medalhas','streak','manual');

-- ============ AVATARS CATALOG ============
CREATE TABLE public.avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.avatar_category NOT NULL,
  image_url text NOT NULL,
  rarity public.cosmetic_rarity NOT NULL DEFAULT 'comum',
  unlock_rule_type public.unlock_rule_type NOT NULL DEFAULT 'starter',
  unlock_threshold integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver avatares" ON public.avatars FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia avatares" ON public.avatars FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ COSMETIC ITEMS CATALOG ============
CREATE TABLE public.cosmetic_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category public.cosmetic_category NOT NULL,
  rarity public.cosmetic_rarity NOT NULL DEFAULT 'comum',
  image_url text NOT NULL,
  unlock_rule_type public.unlock_rule_type NOT NULL DEFAULT 'manual',
  unlock_threshold integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cosmetic_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver itens cosméticos" ON public.cosmetic_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia itens" ON public.cosmetic_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ UNLOCKED ============
CREATE TABLE public.child_unlocked_avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL,
  avatar_id uuid NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  source text,
  UNIQUE (child_id, avatar_id)
);
CREATE INDEX idx_cua_child ON public.child_unlocked_avatars(child_id);

ALTER TABLE public.child_unlocked_avatars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Família vê avatares desbloqueados" ON public.child_unlocked_avatars FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.family_id = public.get_user_family_id(auth.uid())));

CREATE TABLE public.child_unlocked_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.cosmetic_items(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  source text,
  UNIQUE (child_id, item_id)
);
CREATE INDEX idx_cui_child ON public.child_unlocked_items(child_id);

ALTER TABLE public.child_unlocked_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Família vê itens desbloqueados" ON public.child_unlocked_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.family_id = public.get_user_family_id(auth.uid())));

-- ============ EQUIPMENT ============
CREATE TABLE public.child_equipment (
  child_id uuid PRIMARY KEY,
  avatar_id uuid REFERENCES public.avatars(id) ON DELETE SET NULL,
  helmet_item_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  armor_item_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  weapon_item_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  pet_item_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  aura_item_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  frame_item_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  favorite_badge_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  last_seen_unlocks_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.child_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Família vê equipamento" ON public.child_equipment FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.family_id = public.get_user_family_id(auth.uid())));
CREATE POLICY "Família atualiza equipamento" ON public.child_equipment FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.family_id = public.get_user_family_id(auth.uid())));
CREATE POLICY "Família cria equipamento" ON public.child_equipment FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.family_id = public.get_user_family_id(auth.uid())));

-- ============ FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.compute_child_level(_child_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _auris int := 0;
  _medals int := 0;
  _best_streak int := 0;
  _xp int;
  _level int;
  _xp_in_level int;
  _xp_to_next int;
BEGIN
  SELECT COALESCE(SUM(reward_auris),0) INTO _auris FROM public.submissions WHERE child_id = _child_id AND status='aprovado';
  SELECT COUNT(*) INTO _medals FROM public.mission_awards WHERE child_id = _child_id;
  SELECT COALESCE(MAX(public.compute_streak(_child_id, a.id)),0) INTO _best_streak
    FROM public.activities a
    WHERE a.family_id = (SELECT family_id FROM public.children WHERE id = _child_id) AND a.active = true;
  _xp := _auris + _medals * 50 + _best_streak * 5;
  _level := GREATEST(1, FLOOR(SQRT(_xp::numeric / 25))::int + 1);
  _xp_in_level := _xp - 25 * (_level - 1) * (_level - 1);
  _xp_to_next := 25 * _level * _level - 25 * (_level - 1) * (_level - 1);
  RETURN jsonb_build_object('level',_level,'xp',_xp,'xp_in_level',_xp_in_level,'xp_to_next',_xp_to_next,'total_xp',_xp,'auris',_auris,'medals',_medals,'best_streak',_best_streak);
END $$;

CREATE OR REPLACE FUNCTION public.evaluate_cosmetic_unlocks(_child_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _auris int; _medals int; _best_streak int;
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
END $$;

-- Trigger on submission approved
CREATE OR REPLACE FUNCTION public.trg_eval_unlocks_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'aprovado' THEN
    PERFORM public.evaluate_cosmetic_unlocks(NEW.child_id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER eval_unlocks_after_submission
AFTER INSERT OR UPDATE OF status ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.trg_eval_unlocks_submission();

CREATE OR REPLACE FUNCTION public.trg_eval_unlocks_award()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.evaluate_cosmetic_unlocks(NEW.child_id);
  RETURN NEW;
END $$;

CREATE TRIGGER eval_unlocks_after_award
AFTER INSERT ON public.mission_awards
FOR EACH ROW EXECUTE FUNCTION public.trg_eval_unlocks_award();

-- Auto-create equipment row when a child is created
CREATE OR REPLACE FUNCTION public.trg_init_child_equipment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.child_equipment (child_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  PERFORM public.evaluate_cosmetic_unlocks(NEW.id);
  RETURN NEW;
END $$;

CREATE TRIGGER init_child_equipment
AFTER INSERT ON public.children
FOR EACH ROW EXECUTE FUNCTION public.trg_init_child_equipment();

-- ============ EXTEND get_child_dashboard ============
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
        'medals_count', (SELECT COUNT(*) FROM public.mission_awards ma WHERE ma.child_id = c.id),
        'level', (public.compute_child_level(c.id)->>'level')::int
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
    ) ms),
    -- new cosmetic blocks
    'level_info', public.compute_child_level(_child_id),
    'equipment', (SELECT to_jsonb(e) FROM public.child_equipment e WHERE e.child_id = _child_id),
    'unlocked_avatars', (SELECT COALESCE(jsonb_agg(jsonb_build_object('avatar_id',avatar_id,'unlocked_at',unlocked_at)), '[]'::jsonb)
      FROM public.child_unlocked_avatars WHERE child_id = _child_id),
    'unlocked_items', (SELECT COALESCE(jsonb_agg(jsonb_build_object('item_id',item_id,'unlocked_at',unlocked_at)), '[]'::jsonb)
      FROM public.child_unlocked_items WHERE child_id = _child_id),
    'avatars_catalog', (SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.sort_order), '[]'::jsonb)
      FROM public.avatars a WHERE a.active = true),
    'items_catalog', (SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.sort_order), '[]'::jsonb)
      FROM public.cosmetic_items i WHERE i.active = true)
  ) INTO _result;
  RETURN _result;
END;
$function$;

-- ============ Backfill: create equipment rows for existing children ============
INSERT INTO public.child_equipment (child_id)
SELECT id FROM public.children WHERE id NOT IN (SELECT child_id FROM public.child_equipment);

-- Trigger desbloqueio inicial para todas as crianças existentes
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT id FROM public.children LOOP
    PERFORM public.evaluate_cosmetic_unlocks(r.id);
  END LOOP;
END $$;

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('cosmetics','cosmetics',true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars-catalog','avatars-catalog',true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read cosmetics" ON storage.objects FOR SELECT USING (bucket_id = 'cosmetics');
CREATE POLICY "Public read avatars-catalog" ON storage.objects FOR SELECT USING (bucket_id = 'avatars-catalog');
CREATE POLICY "Admin upload cosmetics" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cosmetics' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin upload avatars-catalog" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars-catalog' AND public.has_role(auth.uid(),'admin'));
