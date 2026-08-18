-- Fase 1 (segurança): rate limiting no login de criança.
-- Guarda apenas tentativas malsucedidas, o suficiente para aplicar o limite.
-- Sem policies de SELECT/INSERT para anon/authenticated: só a service_role
-- (usada pela edge function child-login) consegue ler/escrever aqui.

CREATE TABLE IF NOT EXISTS public.child_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_login_attempts_child_time
  ON public.child_login_attempts (child_id, created_at DESC);

ALTER TABLE public.child_login_attempts ENABLE ROW LEVEL SECURITY;

-- Limpeza automática: remove tentativas com mais de 1 dia sempre que uma nova
-- linha é inserida, para a tabela nunca crescer sem controle.
CREATE OR REPLACE FUNCTION public.prune_child_login_attempts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.child_login_attempts WHERE created_at < now() - INTERVAL '1 day';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prune_child_login_attempts ON public.child_login_attempts;
CREATE TRIGGER trg_prune_child_login_attempts
  AFTER INSERT ON public.child_login_attempts
  EXECUTE FUNCTION public.prune_child_login_attempts();
