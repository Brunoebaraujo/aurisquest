CREATE OR REPLACE FUNCTION public.compute_child_level(_child_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _xp numeric := 0;
  _level int := 0;
  _cost numeric;
  _acc numeric := 0;
  _xp_in_level int;
  _xp_to_next int;
  _auris int := 0;
  _medals int := 0;
  _best_streak int := 0;
  _title text;
BEGIN
  -- XP from approved submissions weighted by activity frequency
  SELECT COALESCE(SUM(
    s.reward_auris * CASE COALESCE(a.frequency_hint, 'diaria')
      WHEN 'diaria' THEN 1.0
      WHEN '3x_semana' THEN 1.5
      WHEN 'semanal' THEN 2.0
      WHEN 'quinzenal' THEN 3.0
      WHEN 'mensal' THEN 5.0
      WHEN 'quest_especial' THEN 8.0
      ELSE 1.0
    END
  ), 0) INTO _xp
  FROM public.submissions s
  LEFT JOIN public.activities a ON a.id = s.activity_id
  WHERE s.child_id = _child_id AND s.status = 'aprovado';

  -- Mission bonuses count as quest_especial (8x)
  _xp := _xp + COALESCE((SELECT SUM(bonus_auris) FROM public.mission_awards WHERE child_id = _child_id), 0) * 8.0;
  _xp := _xp + COALESCE((SELECT SUM(bonus_auris) FROM public.shared_mission_awards WHERE child_id = _child_id), 0) * 8.0;

  -- Geometric level curve: cost(N) = round(100 * 1.2^(N-1))
  LOOP
    _cost := round(100 * power(1.2, _level));
    IF _xp >= _acc + _cost THEN
      _acc := _acc + _cost;
      _level := _level + 1;
    ELSE
      EXIT;
    END IF;
    IF _level > 500 THEN EXIT; END IF;
  END LOOP;

  IF _level < 1 THEN _level := 1; _xp_to_next := 100; _xp_in_level := LEAST(_xp::int, 100);
  ELSE
    _xp_to_next := round(100 * power(1.2, _level))::int;
    _xp_in_level := (_xp - _acc)::int;
  END IF;

  _title := CASE _level
    WHEN 1 THEN 'Escudeiro'
    WHEN 2 THEN 'Aventureiro Iniciante'
    WHEN 3 THEN 'Explorador'
    WHEN 4 THEN 'Aventureiro Real'
    WHEN 5 THEN 'Guardião da Jornada'
    WHEN 6 THEN 'Protetor Real'
    WHEN 7 THEN 'Defensor Auris'
    WHEN 8 THEN 'Mestre Explorador'
    WHEN 9 THEN 'Campeão da Guilda'
    WHEN 10 THEN 'Herói Auris'
    WHEN 11 THEN 'Lenda da Guilda'
    WHEN 12 THEN 'Guardião Supremo'
    WHEN 13 THEN 'Mestre dos Reinos'
    WHEN 14 THEN 'Lenda Eterna'
    ELSE 'Guardião de Auroria'
  END;

  SELECT COALESCE(SUM(reward_auris),0) INTO _auris FROM public.submissions WHERE child_id = _child_id AND status='aprovado';
  SELECT COUNT(*) INTO _medals FROM public.mission_awards WHERE child_id = _child_id;
  SELECT COALESCE(MAX(public.compute_streak(_child_id, a.id)),0) INTO _best_streak
    FROM public.activities a
    WHERE a.family_id = (SELECT family_id FROM public.children WHERE id = _child_id) AND a.active = true;

  RETURN jsonb_build_object(
    'level', _level,
    'xp', _xp::int,
    'xp_in_level', _xp_in_level,
    'xp_to_next', _xp_to_next,
    'total_xp', _xp::int,
    'title', _title,
    'auris', _auris,
    'medals', _medals,
    'best_streak', _best_streak
  );
END $function$;