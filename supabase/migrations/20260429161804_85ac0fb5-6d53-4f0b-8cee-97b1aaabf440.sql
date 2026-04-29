-- 1. Habilita extensão pgcrypto para bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Adiciona coluna para rastrear quando senha foi definida
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;

-- 3. Tabela de sessões das crianças
CREATE TABLE IF NOT EXISTS public.child_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL,
  family_id UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_sessions_token ON public.child_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_child_sessions_child ON public.child_sessions(child_id);

ALTER TABLE public.child_sessions ENABLE ROW LEVEL SECURITY;

-- Sem políticas públicas — só edge functions com service role acessam
CREATE POLICY "Família vê sessões dos filhos"
  ON public.child_sessions FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Família apaga sessões dos filhos"
  ON public.child_sessions FOR DELETE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

-- 4. Função para validar token e devolver child_id + family_id
CREATE OR REPLACE FUNCTION public.validate_child_token(_token TEXT)
RETURNS TABLE(child_id UUID, family_id UUID)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hash TEXT;
BEGIN
  _hash := encode(digest(_token, 'sha256'), 'hex');
  RETURN QUERY
  SELECT s.child_id, s.family_id
  FROM public.child_sessions s
  WHERE s.token_hash = _hash
    AND s.expires_at > now()
  LIMIT 1;
END;
$$;

-- 5. Função pública para listar crianças ativas (sem expor password_hash)
CREATE OR REPLACE FUNCTION public.list_active_children_public()
RETURNS TABLE(id UUID, name TEXT, avatar_url TEXT, has_password BOOLEAN)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.avatar_url, (c.password_hash IS NOT NULL) AS has_password
  FROM public.children c
  WHERE c.active = TRUE
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION public.list_active_children_public() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_child_token(TEXT) TO anon, authenticated;

-- 6. Remove leitura pública crua da tabela children (que expunha password_hash)
DROP POLICY IF EXISTS "Acesso público à criança ativa por id" ON public.children;

-- 7. Remove INSERT público de submissions sem autenticação
DROP POLICY IF EXISTS "Criança envia submissão" ON public.submissions;

-- 8. Remove leitura pública crua de submissions
DROP POLICY IF EXISTS "Acesso público a submissões por criança" ON public.submissions;

-- 9. Remove leitura pública de mission_awards e payments (usadas só no perfil interno)
DROP POLICY IF EXISTS "Acesso público a conquistas" ON public.mission_awards;
DROP POLICY IF EXISTS "Acesso público a pagamentos" ON public.payments;

-- 10. Remove leitura pública crua de activities (substituída por função se necessário)
DROP POLICY IF EXISTS "Acesso público a atividades ativas" ON public.activities;

-- 11. Função pública para criança autenticada listar suas atividades, submissões etc
CREATE OR REPLACE FUNCTION public.get_child_dashboard(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _child_id UUID;
  _family_id UUID;
  _result JSONB;
BEGIN
  SELECT v.child_id, v.family_id INTO _child_id, _family_id
  FROM public.validate_child_token(_token) v;

  IF _child_id IS NULL THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  SELECT jsonb_build_object(
    'child', (SELECT jsonb_build_object('id', id, 'name', name, 'avatar_url', avatar_url)
              FROM public.children WHERE id = _child_id),
    'activities', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                      'id', id, 'name', name, 'description', description,
                      'reward_amount_cents', reward_amount_cents, 'category', category,
                      'frequency_hint', frequency_hint
                    )), '[]'::jsonb)
                   FROM public.activities
                   WHERE family_id = _family_id AND active = TRUE),
    'submissions', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                       'id', id, 'activity_id', activity_id, 'status', status,
                       'completed_at', completed_at, 'reward_amount_cents', reward_amount_cents
                     ) ORDER BY completed_at DESC), '[]'::jsonb)
                    FROM (SELECT * FROM public.submissions
                          WHERE child_id = _child_id
                          ORDER BY completed_at DESC LIMIT 50) s),
    'awards', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                  'id', ma.id, 'mission_id', ma.mission_id,
                  'mission_name', m.name, 'medal_url', m.medal_url,
                  'awarded_at', ma.awarded_at
                )), '[]'::jsonb)
               FROM public.mission_awards ma
               JOIN public.missions m ON m.id = ma.mission_id
               WHERE ma.child_id = _child_id)
  ) INTO _result;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_child_dashboard(TEXT) TO anon, authenticated;