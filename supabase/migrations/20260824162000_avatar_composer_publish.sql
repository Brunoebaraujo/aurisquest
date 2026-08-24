CREATE TABLE IF NOT EXISTS public.avatar_render_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_key text NOT NULL UNIQUE CHECK (avatar_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  name text NOT NULL,
  layout jsonb NOT NULL,
  published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS avatars_avatar_key_upsert_unique ON public.avatars (avatar_key);
CREATE UNIQUE INDEX IF NOT EXISTS cosmetic_items_equipment_key_upsert_unique ON public.cosmetic_items (equipment_key);
ALTER TABLE public.avatar_render_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published avatar layouts are readable" ON public.avatar_render_sets FOR SELECT USING (published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage avatar layouts" ON public.avatar_render_sets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public) VALUES ('avatar-assets', 'avatar-assets', true) ON CONFLICT (id) DO UPDATE SET public = true;
CREATE POLICY "Avatar assets are public" ON storage.objects FOR SELECT USING (bucket_id = 'avatar-assets');
CREATE POLICY "Admins upload avatar assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatar-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update avatar assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatar-assets' AND public.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'avatar-assets' AND public.has_role(auth.uid(), 'admin'));
