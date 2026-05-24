drop function if exists public.compute_child_level(uuid);
drop function if exists public.compute_child_level(text);

create function public.compute_child_level(_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_xp integer := 0;
  v_level integer := 0;
  v_current_level_min_xp integer := 0;
  v_next_level integer := 1;
  v_next_level_total_xp integer := 100;
  v_xp_required_for_level integer := 100;
  v_xp_in_level integer := 0;
  v_xp_to_next integer := 100;
  v_xp_remaining integer := 100;
  v_auris integer := 0;
  v_medals integer := 0;
  v_best_streak integer := 0;
  v_title text := 'Escudeiro';
begin
  select coalesce(sum(s.reward_auris), 0)::integer
    into v_auris
  from public.submissions s
  where s.child_id = _child_id
    and s.status = 'aprovado';

  select coalesce(count(*), 0)::integer
    into v_medals
  from (
    select ma.id
    from public.mission_awards ma
    where ma.child_id = _child_id
    union all
    select sma.id
    from public.shared_mission_awards sma
    where sma.child_id = _child_id
  ) awards;

  with approved_days as (
    select distinct s.completed_at::date as completed_day
    from public.submissions s
    where s.child_id = _child_id
      and s.status = 'aprovado'
  ), grouped_days as (
    select
      completed_day,
      completed_day - (row_number() over (order by completed_day))::integer as streak_group
    from approved_days
  )
  select coalesce(max(streak_count), 0)::integer
    into v_best_streak
  from (
    select count(*) as streak_count
    from grouped_days
    group by streak_group
  ) streaks;

  v_total_xp := v_auris;

  -- Official Auris Quest XP progression table. Keep level thresholds centralized here.
  with xp_progression(level, total_xp_required) as (
    values
      (0, 0),
      (1, 100),
      (2, 220),
      (3, 364),
      (4, 537),
      (5, 744),
      (6, 993),
      (7, 1292),
      (8, 1650),
      (9, 2080),
      (10, 2596),
      (11, 3215),
      (12, 3958),
      (13, 4850),
      (14, 5920),
      (15, 7204)
  ), current_level as (
    select level, total_xp_required
    from xp_progression
    where total_xp_required <= v_total_xp
    order by total_xp_required desc
    limit 1
  ), next_level as (
    select level, total_xp_required
    from xp_progression
    where total_xp_required > v_total_xp
    order by total_xp_required asc
    limit 1
  )
  select
    c.level,
    c.total_xp_required,
    coalesce(n.level, c.level),
    coalesce(n.total_xp_required, c.total_xp_required),
    coalesce(n.total_xp_required - c.total_xp_required, 0)
  into
    v_level,
    v_current_level_min_xp,
    v_next_level,
    v_next_level_total_xp,
    v_xp_required_for_level
  from current_level c
  left join next_level n on true;

  v_xp_in_level := greatest(v_total_xp - v_current_level_min_xp, 0);
  v_xp_to_next := greatest(v_next_level_total_xp - v_current_level_min_xp, 1);
  v_xp_remaining := greatest(v_next_level_total_xp - v_total_xp, 0);

  v_title := case
    when v_level >= 15 then 'Mestre das Missões'
    when v_level >= 10 then 'Guardião Dourado'
    when v_level >= 5 then 'Aventureiro'
    else 'Escudeiro'
  end;

  return jsonb_build_object(
    'level', v_level,
    'title', v_title,
    'xp', v_total_xp,
    'total_xp', v_total_xp,
    'current_level_min_xp', v_current_level_min_xp,
    'next_level', v_next_level,
    'next_level_total_xp', v_next_level_total_xp,
    'xp_required_for_level', v_xp_required_for_level,
    'xp_remaining', v_xp_remaining,
    'xp_in_level', v_xp_in_level,
    'xp_to_next', v_xp_to_next,
    'auris', v_auris,
    'medals', v_medals,
    'best_streak', v_best_streak
  );
end;
$$;

create function public.compute_child_level(_child_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.compute_child_level(_child_id::uuid);
$$;

grant execute on function public.compute_child_level(uuid) to anon, authenticated;
grant execute on function public.compute_child_level(text) to anon, authenticated;
