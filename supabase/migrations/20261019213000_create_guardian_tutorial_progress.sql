-- Progress is deliberately owned by the responsible user, not by the family.
-- Two parents in the same family can take (or skip) the journey independently.
CREATE TABLE IF NOT EXISTS public.guardian_tutorial_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tutorial_version TEXT NOT NULL DEFAULT 'first-journey-v2',
  current_phase TEXT NOT NULL DEFAULT 'onboarding'
    CHECK (current_phase IN ('onboarding', 'app')),
  current_step INTEGER NOT NULL DEFAULT 0 CHECK (current_step >= 0),
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'dismissed')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.guardian_tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê sua jornada do guardião"
  ON public.guardian_tutorial_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuário cria sua jornada do guardião"
  ON public.guardian_tutorial_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário atualiza sua jornada do guardião"
  ON public.guardian_tutorial_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
