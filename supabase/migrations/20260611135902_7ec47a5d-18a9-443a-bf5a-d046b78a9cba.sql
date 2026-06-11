
-- 1. Revoke token_hash column read access from authenticated parents
REVOKE SELECT (token_hash) ON public.child_sessions FROM authenticated;
REVOKE SELECT (token_hash) ON public.child_sessions FROM anon;

-- 2. Tighten invitations SELECT: only the creator (or admins) can see their own invitations
DROP POLICY IF EXISTS "Responsavel vê convites da família" ON public.invitations;
CREATE POLICY "Responsavel vê seus próprios convites"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  kind = 'family_responsible'
  AND family_id = get_user_family_id(auth.uid())
  AND created_by = auth.uid()
);
