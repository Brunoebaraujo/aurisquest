CREATE POLICY "Ver família criada por mim"
ON public.families
FOR SELECT
TO authenticated
USING (created_by = auth.uid());