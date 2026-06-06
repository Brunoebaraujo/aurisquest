
-- ============ TABELA: rewards ============
CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  auris_cost integer NOT NULL CHECK (auris_cost > 0),
  category text NOT NULL DEFAULT 'custom' CHECK (category IN ('money','screen_time','privilege','experience','item','custom')),
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  -- Future-ready fields (nullable, unused for now)
  image_url text,
  stock integer,
  available_from timestamptz,
  available_until timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rewards_family ON public.rewards(family_id);
CREATE INDEX idx_rewards_family_active ON public.rewards(family_id, active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver recompensas da família" ON public.rewards
  FOR SELECT TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Criar recompensas na família" ON public.rewards
  FOR INSERT TO authenticated
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Atualizar recompensas da família" ON public.rewards
  FOR UPDATE TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()))
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Apagar recompensas da família" ON public.rewards
  FOR DELETE TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

-- ============ TABELA: reward_redemptions ============
CREATE TABLE public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  reward_id uuid REFERENCES public.rewards(id) ON DELETE SET NULL,
  reward_name_snapshot text NOT NULL,
  reward_category_snapshot text NOT NULL DEFAULT 'custom',
  auris_cost integer NOT NULL CHECK (auris_cost >= 0),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','recusado','concluido')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_note text,
  legacy_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_redemptions_family ON public.reward_redemptions(family_id);
CREATE INDEX idx_redemptions_child ON public.reward_redemptions(child_id);
CREATE INDEX idx_redemptions_status ON public.reward_redemptions(family_id, status);
CREATE UNIQUE INDEX idx_redemptions_legacy ON public.reward_redemptions(legacy_payment_id) WHERE legacy_payment_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver resgates da família" ON public.reward_redemptions
  FOR SELECT TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Criar resgates na família" ON public.reward_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Atualizar resgates da família" ON public.reward_redemptions
  FOR UPDATE TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()))
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Apagar resgates da família" ON public.reward_redemptions
  FOR DELETE TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public._touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_rewards_updated BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
CREATE TRIGGER trg_redemptions_updated BEFORE UPDATE ON public.reward_redemptions
  FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

-- ============ MIGRAÇÃO DE PAGAMENTOS LEGADOS ============
INSERT INTO public.reward_redemptions
  (family_id, child_id, reward_id, reward_name_snapshot, reward_category_snapshot,
   auris_cost, status, requested_at, reviewed_at, reviewed_by, legacy_payment_id, created_at)
SELECT
  p.family_id,
  p.child_id,
  NULL,
  'Dinheiro — ' || to_char((p.amount_cents::numeric / 100), 'FM"R$" 999G999G990D00'),
  'money',
  COALESCE(p.auris_redeemed, 0),
  'concluido',
  p.paid_at,
  p.paid_at,
  p.created_by,
  p.id,
  p.created_at
FROM public.payments p
WHERE NOT EXISTS (
  SELECT 1 FROM public.reward_redemptions r WHERE r.legacy_payment_id = p.id
);

-- ============ ATUALIZAR get_child_dashboard ============
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
    -- saldo gasto: pagamentos legados + resgates não-legados aprovados/concluídos
    'paid_auris', (
      (SELECT COALESCE(SUM(auris_redeemed), 0) FROM public.payments WHERE child_id = _child_id)
      + (SELECT COALESCE(SUM(auris_cost), 0) FROM public.reward_redemptions
         WHERE child_id = _child_id AND legacy_payment_id IS NULL
           AND status IN ('aprovado','concluido'))
    ),
    'pending_redemption_auris', (SELECT COALESCE(SUM(auris_cost),0) FROM public.reward_redemptions
      WHERE child_id = _child_id AND status = 'pendente'),
    'rewards_catalog', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'description', description, 'auris_cost', auris_cost,
      'category', category, 'image_url', image_url) ORDER BY auris_cost), '[]'::jsonb)
      FROM public.rewards WHERE family_id = _family_id AND active = TRUE),
    'reward_redemptions', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'reward_id', reward_id, 'reward_name', reward_name_snapshot,
      'category', reward_category_snapshot, 'auris_cost', auris_cost, 'status', status,
      'requested_at', requested_at, 'reviewed_at', reviewed_at, 'review_note', review_note)
      ORDER BY requested_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.reward_redemptions WHERE child_id = _child_id
            ORDER BY requested_at DESC LIMIT 50) r),
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
