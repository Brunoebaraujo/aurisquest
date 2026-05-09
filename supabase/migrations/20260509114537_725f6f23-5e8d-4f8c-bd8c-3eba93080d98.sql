
-- 1) Famílias: slug + token de acesso das crianças
ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS kid_access_token text;

-- Helper para slugificar (sem extensão unaccent)
CREATE OR REPLACE FUNCTION public._slugify(_text text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
           regexp_replace(lower(coalesce(_text,'familia')), '[^a-z0-9]+', '-', 'g'),
           '(^-+|-+$)', '', 'g')
$$;

-- Backfill
DO $$
DECLARE r RECORD; base text; candidate text; i int;
BEGIN
  FOR r IN SELECT id, name FROM public.families WHERE slug IS NULL OR kid_access_token IS NULL LOOP
    base := COALESCE(NULLIF(public._slugify(r.name),''),'familia');
    candidate := base;
    i := 0;
    WHILE EXISTS (SELECT 1 FROM public.families WHERE slug = candidate AND id <> r.id) LOOP
      i := i + 1;
      candidate := base || '-' || substr(md5(r.id::text || i::text), 1, 4);
    END LOOP;
    UPDATE public.families
       SET slug = COALESCE(slug, candidate),
           kid_access_token = COALESCE(kid_access_token, replace(encode(gen_random_bytes(18),'base64'),'/','_'))
     WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.families
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN kid_access_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS families_slug_key ON public.families(slug);
CREATE UNIQUE INDEX IF NOT EXISTS families_kid_access_token_key ON public.families(kid_access_token);

-- Trigger para garantir slug/token em novas famílias
CREATE OR REPLACE FUNCTION public.families_set_access_defaults()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE base text; candidate text; i int := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := COALESCE(NULLIF(public._slugify(NEW.name),''),'familia');
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.families WHERE slug = candidate) LOOP
      i := i + 1;
      candidate := base || '-' || substr(md5(random()::text || i::text), 1, 4);
    END LOOP;
    NEW.slug := candidate;
  END IF;
  IF NEW.kid_access_token IS NULL OR NEW.kid_access_token = '' THEN
    NEW.kid_access_token := replace(encode(gen_random_bytes(18),'base64'),'/','_');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_families_access_defaults ON public.families;
CREATE TRIGGER trg_families_access_defaults
  BEFORE INSERT ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.families_set_access_defaults();

-- 2) Função pública para listar crianças por token da família (substitui a versão insegura)
CREATE OR REPLACE FUNCTION public.list_children_by_family_token(_token text)
RETURNS TABLE(family_id uuid, family_name text, child_id uuid, child_name text, avatar_url text, has_password boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.name, c.id, c.name, c.avatar_url, (c.password_hash IS NOT NULL)
  FROM public.families f
  JOIN public.children c ON c.family_id = f.id AND c.active = TRUE
  WHERE f.slug = _token OR f.kid_access_token = _token
  ORDER BY c.name;
$$;

-- A versão antiga vazava crianças de TODAS as famílias. Tornar segura: retorna vazio.
CREATE OR REPLACE FUNCTION public.list_active_children_public()
RETURNS TABLE(id uuid, name text, avatar_url text, has_password boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NULL::uuid, NULL::text, NULL::text, NULL::boolean WHERE FALSE;
$$;

-- Função utilitária para validar família por token (usada pela edge function)
CREATE OR REPLACE FUNCTION public.get_family_id_by_token(_token text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.families WHERE slug = _token OR kid_access_token = _token LIMIT 1;
$$;

-- 3) Convites: tipo (kind)
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'family_onboarding';

-- accept_invitation precisa lidar com kind = family_responsible
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv RECORD; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _inv FROM public.invitations WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF _inv.status <> 'pendente' THEN RAISE EXCEPTION 'invitation_used'; END IF;
  IF _inv.expires_at <= now() THEN
    UPDATE public.invitations SET status='expirado' WHERE id=_inv.id;
    RAISE EXCEPTION 'invitation_expired';
  END IF;

  UPDATE public.profiles SET family_id = _inv.family_id WHERE id = _uid;

  IF _inv.kind = 'family_responsible' THEN
    -- não altera primary_parent nem status da família
    NULL;
  ELSE
    UPDATE public.families
      SET status='ativa',
          primary_parent_id = COALESCE(primary_parent_id, _uid)
      WHERE id = _inv.family_id;
  END IF;

  UPDATE public.invitations SET status='aceito', accepted_at=now(), accepted_by=_uid WHERE id=_inv.id;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'parent') ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'family_id', _inv.family_id,
    'family_name', (SELECT name FROM public.families WHERE id = _inv.family_id),
    'kind', _inv.kind
  );
END $$;

-- Função para responsável criar convite de outro responsável da mesma família
CREATE OR REPLACE FUNCTION public.create_responsible_invitation(_name text, _contact text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _fid uuid; _token text; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  _fid := public.get_user_family_id(_uid);
  IF _fid IS NULL THEN RAISE EXCEPTION 'no_family'; END IF;
  IF length(coalesce(trim(_name),'')) < 2 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF length(coalesce(trim(_contact),'')) < 3 THEN RAISE EXCEPTION 'invalid_contact'; END IF;

  _token := replace(replace(encode(gen_random_bytes(24),'base64'),'/','_'),'+','-');

  INSERT INTO public.invitations(family_id, token, parent_name, contact, created_by, kind)
  VALUES (_fid, _token, trim(_name), trim(_contact), _uid, 'family_responsible')
  RETURNING id INTO _id;

  RETURN jsonb_build_object('id', _id, 'token', _token);
END $$;

-- RLS: responsáveis veem/criam convites do próprio family_id quando kind='family_responsible'
CREATE POLICY "Responsavel vê convites da família"
  ON public.invitations FOR SELECT TO authenticated
  USING (kind = 'family_responsible' AND family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Responsavel cancela convite da família"
  ON public.invitations FOR UPDATE TO authenticated
  USING (kind = 'family_responsible' AND family_id = public.get_user_family_id(auth.uid()));

-- RLS: responsáveis veem perfis da própria família
CREATE POLICY "Ver perfis da minha família"
  ON public.profiles FOR SELECT TO authenticated
  USING (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()));
