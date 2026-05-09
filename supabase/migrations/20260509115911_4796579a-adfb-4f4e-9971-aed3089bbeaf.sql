CREATE OR REPLACE FUNCTION public.create_responsible_invitation(_name text, _contact text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE _uid uuid := auth.uid(); _fid uuid; _token text; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  _fid := public.get_user_family_id(_uid);
  IF _fid IS NULL THEN RAISE EXCEPTION 'no_family'; END IF;
  IF length(coalesce(trim(_name),'')) < 2 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF length(coalesce(trim(_contact),'')) < 3 THEN RAISE EXCEPTION 'invalid_contact'; END IF;

  _token := replace(replace(encode(extensions.gen_random_bytes(24),'base64'),'/','_'),'+','-');

  INSERT INTO public.invitations(family_id, token, parent_name, contact, created_by, kind)
  VALUES (_fid, _token, trim(_name), trim(_contact), _uid, 'family_responsible')
  RETURNING id INTO _id;

  RETURN jsonb_build_object('id', _id, 'token', _token);
END $function$;