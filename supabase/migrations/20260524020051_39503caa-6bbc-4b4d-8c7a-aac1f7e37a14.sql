
-- 1. Fix self-referential RLS on shared_mission_logs INSERT
DROP POLICY IF EXISTS "Responsavel registra propria crianca" ON public.shared_mission_logs;
CREATE POLICY "Responsavel registra propria crianca"
ON public.shared_mission_logs
FOR INSERT TO authenticated
WITH CHECK (
  family_id = public.get_user_family_id(auth.uid())
  AND approved_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = shared_mission_logs.child_id
      AND c.family_id = public.get_user_family_id(auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.shared_missions m
    JOIN public.shared_group_members sgm ON sgm.group_id = m.group_id
    WHERE m.id = shared_mission_logs.mission_id
      AND sgm.family_id = public.get_user_family_id(auth.uid())
  )
);

-- 2. Scope avatars storage bucket uploads to user-owned folder
DROP POLICY IF EXISTS "Upload de avatar autenticado" ON storage.objects;
CREATE POLICY "Upload de avatar autenticado"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Scope medals bucket policies to family-owned folder
DROP POLICY IF EXISTS "Responsáveis enviam medalhas" ON storage.objects;
DROP POLICY IF EXISTS "Responsáveis atualizam medalhas" ON storage.objects;
DROP POLICY IF EXISTS "Responsáveis apagam medalhas" ON storage.objects;

CREATE POLICY "Responsáveis enviam medalhas"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'medals'
  AND (storage.foldername(name))[1] = public.get_user_family_id(auth.uid())::text
);

CREATE POLICY "Responsáveis atualizam medalhas"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'medals'
  AND (storage.foldername(name))[1] = public.get_user_family_id(auth.uid())::text
);

CREATE POLICY "Responsáveis apagam medalhas"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'medals'
  AND (storage.foldername(name))[1] = public.get_user_family_id(auth.uid())::text
);

-- 4. Set search_path on functions missing it
ALTER FUNCTION public._slugify(text) SET search_path = public;
ALTER FUNCTION public.prevent_delete_active_reward() SET search_path = public;
