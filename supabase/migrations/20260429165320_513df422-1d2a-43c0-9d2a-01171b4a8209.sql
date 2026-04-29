CREATE OR REPLACE FUNCTION public.validate_child_token(_token text)
 RETURNS TABLE(child_id uuid, family_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _hash TEXT;
BEGIN
  _hash := encode(extensions.digest(_token, 'sha256'), 'hex');
  RETURN QUERY
  SELECT s.child_id, s.family_id
  FROM public.child_sessions s
  WHERE s.token_hash = _hash
    AND s.expires_at > now()
  LIMIT 1;
END;
$function$;