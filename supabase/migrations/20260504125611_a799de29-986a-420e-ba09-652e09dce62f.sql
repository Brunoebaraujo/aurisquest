-- 1) Enum de roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'parent', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Tabela user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) has_role (security definer evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- Políticas user_roles
DROP POLICY IF EXISTS "Ver meus papéis" ON public.user_roles;
CREATE POLICY "Ver meus papéis" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin vê todos os papéis" ON public.user_roles;
CREATE POLICY "Admin vê todos os papéis" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin gerencia papéis" ON public.user_roles;
CREATE POLICY "Admin gerencia papéis" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) families: novos campos
ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS primary_parent_id UUID REFERENCES auth.users(id);

-- Backfill: famílias existentes ativas com criador como responsável principal
UPDATE public.families SET primary_parent_id = created_by WHERE primary_parent_id IS NULL;

-- Backfill: dar role 'parent' a todos os criadores de família existentes
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT created_by, 'parent'::public.app_role FROM public.families
ON CONFLICT DO NOTHING;

-- Admin pode ver todas as famílias
DROP POLICY IF EXISTS "Admin vê todas as famílias" ON public.families;
CREATE POLICY "Admin vê todas as famílias" ON public.families
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin cria famílias" ON public.families;
CREATE POLICY "Admin cria famílias" ON public.families
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

DROP POLICY IF EXISTS "Admin atualiza famílias" ON public.families;
CREATE POLICY "Admin atualiza famílias" ON public.families
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5) invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  parent_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | aceito | cancelado | expirado
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_family ON public.invitations(family_id);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin vê convites" ON public.invitations;
CREATE POLICY "Admin vê convites" ON public.invitations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin cria convites" ON public.invitations;
CREATE POLICY "Admin cria convites" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

DROP POLICY IF EXISTS "Admin atualiza convites" ON public.invitations;
CREATE POLICY "Admin atualiza convites" ON public.invitations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin apaga convites" ON public.invitations;
CREATE POLICY "Admin apaga convites" ON public.invitations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6) Função pública para visualizar convite pelo token (sem auth)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token TEXT)
RETURNS TABLE(
  family_id UUID,
  family_name TEXT,
  parent_name TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    i.family_id,
    f.name AS family_name,
    i.parent_name,
    i.status,
    i.expires_at,
    (i.status = 'pendente' AND i.expires_at > now()) AS is_valid
  FROM public.invitations i
  JOIN public.families f ON f.id = i.family_id
  WHERE i.token = _token
  LIMIT 1;
$$;

-- 7) Aceitar convite (usuário autenticado)
CREATE OR REPLACE FUNCTION public.accept_invitation(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _inv RECORD;
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO _inv FROM public.invitations WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF _inv.status <> 'pendente' THEN RAISE EXCEPTION 'invitation_used'; END IF;
  IF _inv.expires_at <= now() THEN
    UPDATE public.invitations SET status = 'expirado' WHERE id = _inv.id;
    RAISE EXCEPTION 'invitation_expired';
  END IF;

  -- Vincula perfil à família
  UPDATE public.profiles SET family_id = _inv.family_id WHERE id = _uid;

  -- Atualiza família: ativa + responsável principal (se ainda não houver)
  UPDATE public.families
    SET status = 'ativa',
        primary_parent_id = COALESCE(primary_parent_id, _uid)
    WHERE id = _inv.family_id;

  -- Marca convite como aceito
  UPDATE public.invitations
    SET status = 'aceito', accepted_at = now(), accepted_by = _uid
    WHERE id = _inv.id;

  -- Concede role parent
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'parent')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('family_id', _inv.family_id, 'family_name',
    (SELECT name FROM public.families WHERE id = _inv.family_id));
END;
$$;

-- 8) Job para marcar convites expirados (chamado sob demanda pelo admin)
CREATE OR REPLACE FUNCTION public.expire_invitations()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _n INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  WITH upd AS (
    UPDATE public.invitations
       SET status = 'expirado'
     WHERE status = 'pendente' AND expires_at <= now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO _n FROM upd;
  RETURN _n;
END;
$$;