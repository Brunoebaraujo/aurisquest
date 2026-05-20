-- 1. RPC to delete pending family safely
CREATE OR REPLACE FUNCTION public.admin_delete_pending_family(_family_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _fam RECORD;
  _children_count int;
  _profiles_count int;
  _subs_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _fam FROM public.families WHERE id = _family_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'family_not_found'; END IF;

  IF _fam.status <> 'pendente' THEN
    RAISE EXCEPTION 'family_not_pending';
  END IF;

  SELECT COUNT(*) INTO _children_count FROM public.children WHERE family_id = _family_id;
  IF _children_count > 0 THEN RAISE EXCEPTION 'family_has_children'; END IF;

  SELECT COUNT(*) INTO _profiles_count FROM public.profiles WHERE family_id = _family_id;
  IF _profiles_count > 0 THEN RAISE EXCEPTION 'family_has_users'; END IF;

  SELECT COUNT(*) INTO _subs_count FROM public.submissions WHERE family_id = _family_id;
  IF _subs_count > 0 THEN RAISE EXCEPTION 'family_has_activity'; END IF;

  DELETE FROM public.invitations WHERE family_id = _family_id;
  DELETE FROM public.activities WHERE family_id = _family_id;
  DELETE FROM public.families WHERE id = _family_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 2. Allow admin DELETE on families (for the function path / RLS safety)
CREATE POLICY "Admin apaga famílias"
ON public.families FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Prevent deletion of active rewards
CREATE OR REPLACE FUNCTION public.prevent_delete_active_reward()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.active = true THEN
    RAISE EXCEPTION 'cannot_delete_active_reward';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_active_avatar ON public.avatars;
CREATE TRIGGER trg_prevent_delete_active_avatar
BEFORE DELETE ON public.avatars
FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_active_reward();

DROP TRIGGER IF EXISTS trg_prevent_delete_active_item ON public.cosmetic_items;
CREATE TRIGGER trg_prevent_delete_active_item
BEFORE DELETE ON public.cosmetic_items
FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_active_reward();