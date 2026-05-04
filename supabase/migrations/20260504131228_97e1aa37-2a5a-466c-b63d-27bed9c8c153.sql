CREATE OR REPLACE FUNCTION public.compute_streak(_child_id uuid, _activity_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  streak INTEGER := 0;
  today DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  cur_day DATE;
  has_today BOOLEAN;
  has_day BOOLEAN;
BEGIN
  -- Verifica se há registro hoje. Se sim, começa a contagem por hoje.
  -- Se não, começa a contagem por ontem (não zera a ofensiva apenas porque o dia ainda não teve registro).
  SELECT EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.child_id = _child_id
      AND s.activity_id = _activity_id
      AND s.status = 'aprovado'
      AND (s.completed_at AT TIME ZONE 'America/Sao_Paulo')::date = today
  ) INTO has_today;

  IF has_today THEN
    cur_day := today;
  ELSE
    cur_day := today - INTERVAL '1 day';
  END IF;

  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.child_id = _child_id
        AND s.activity_id = _activity_id
        AND s.status = 'aprovado'
        AND (s.completed_at AT TIME ZONE 'America/Sao_Paulo')::date = cur_day
    ) INTO has_day;
    IF NOT has_day THEN
      EXIT;
    END IF;
    streak := streak + 1;
    cur_day := cur_day - INTERVAL '1 day';
  END LOOP;
  RETURN streak;
END;
$function$;