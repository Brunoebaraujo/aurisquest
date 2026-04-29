
-- =========================
-- FAMILIES
-- =========================
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- =========================
-- PROFILES (responsáveis)
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,                       -- = auth.users.id
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para evitar recursão de RLS
CREATE OR REPLACE FUNCTION public.get_user_family_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Trigger: ao criar usuário no auth, cria profile vazio
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- CHILDREN
-- =========================
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  username TEXT UNIQUE,                  -- usado para login da criança (Fase 4)
  password_hash TEXT,                    -- hash da senha da criança (Fase 4)
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_children_family ON public.children(family_id);

-- =========================
-- ACTIVITIES
-- =========================
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  reward_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (reward_amount_cents >= 0),
  category TEXT,
  frequency_hint TEXT,                   -- ex: 'diaria', 'semanal'
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_activities_family ON public.activities(family_id);

-- =========================
-- SUBMISSIONS
-- =========================
CREATE TYPE public.submission_status AS ENUM ('pendente', 'aprovado', 'recusado');

CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  photo_url TEXT,
  status public.submission_status NOT NULL DEFAULT 'pendente',
  reward_amount_cents INTEGER NOT NULL DEFAULT 0,  -- snapshot da recompensa
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_submissions_family ON public.submissions(family_id);
CREATE INDEX idx_submissions_child ON public.submissions(child_id);
CREATE INDEX idx_submissions_status ON public.submissions(status);
CREATE INDEX idx_submissions_completed_at ON public.submissions(completed_at);

-- =========================
-- PAYMENTS (pagamentos/resgates)
-- =========================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  note TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payments_family ON public.payments(family_id);
CREATE INDEX idx_payments_child ON public.payments(child_id);

-- =========================
-- RLS POLICIES
-- =========================

-- Families: o usuário pode ler/atualizar a família dele; criar quando ainda não tem
CREATE POLICY "Ver minha família"
  ON public.families FOR SELECT
  TO authenticated
  USING (id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Criar família"
  ON public.families FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Atualizar minha família"
  ON public.families FOR UPDATE
  TO authenticated
  USING (id = public.get_user_family_id(auth.uid()));

-- Profiles
CREATE POLICY "Ver meu perfil"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Atualizar meu perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Helper macro de policy para tabelas family-scoped
-- Children
CREATE POLICY "Ver crianças da família"
  ON public.children FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Criar criança na família"
  ON public.children FOR INSERT
  TO authenticated
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Atualizar criança da família"
  ON public.children FOR UPDATE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Apagar criança da família"
  ON public.children FOR DELETE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

-- Activities
CREATE POLICY "Ver atividades da família"
  ON public.activities FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Criar atividade na família"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Atualizar atividade da família"
  ON public.activities FOR UPDATE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Apagar atividade da família"
  ON public.activities FOR DELETE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

-- Submissions
CREATE POLICY "Ver submissões da família"
  ON public.submissions FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Criar submissão na família"
  ON public.submissions FOR INSERT
  TO authenticated
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Atualizar submissão da família"
  ON public.submissions FOR UPDATE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Apagar submissão da família"
  ON public.submissions FOR DELETE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

-- Payments
CREATE POLICY "Ver pagamentos da família"
  ON public.payments FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Criar pagamento na família"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Apagar pagamento da família"
  ON public.payments FOR DELETE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

-- =========================
-- STORAGE BUCKETS
-- =========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage: qualquer usuário autenticado pode subir, todos podem ler (buckets públicos)
CREATE POLICY "Leitura pública de provas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'proofs');

CREATE POLICY "Upload de provas autenticado"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'proofs');

CREATE POLICY "Apagar prova própria"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'proofs' AND owner = auth.uid());

CREATE POLICY "Leitura pública de avatares"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Upload de avatar autenticado"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Apagar avatar próprio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());
