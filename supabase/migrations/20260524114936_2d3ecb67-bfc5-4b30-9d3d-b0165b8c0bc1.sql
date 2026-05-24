
-- Hide sensitive columns from authenticated/anon roles.
-- Edge functions use service_role, so they remain unaffected.

-- 1) children.password_hash and password_set_at should never leave the server.
REVOKE SELECT (password_hash, password_set_at) ON public.children FROM authenticated, anon;

-- 2) families.kid_access_token is a credential; slug is the public-facing identifier.
REVOKE SELECT (kid_access_token) ON public.families FROM authenticated, anon;
