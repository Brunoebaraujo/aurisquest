create or replace function public.compute_child_level(_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_xp integer := 0;
  v_level integer := 1;
  v_level_start_total_xp integer := 0;
  v_next_level_total_xp integer := 100;
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

  while v_total_xp >= v_next_level_total_xp loop
    v_level := v_level + 1;
    v_level_start_total_xp := v_next_level_total_xp;
    v_next_level_total_xp := ((v_level * (v_level + 1)) / 2) * 100;
  end loop;

  v_xp_in_level := greatest(v_total_xp - v_level_start_total_xp, 0);
  v_xp_to_next := greatest(v_next_level_total_xp - v_level_start_total_xp, 1);
  v_xp_remaining := greatest(v_next_level_total_xp - v_total_xp, 0);

  v_title := case
    when v_level >= 20 then 'Lenda Auris'
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
    'next_level_total_xp', v_next_level_total_xp,
    'xp_remaining', v_xp_remaining,
    'xp_in_level', v_xp_in_level,
    'xp_to_next', v_xp_to_next,
    'auris', v_auris,
    'medals', v_medals,
    'best_streak', v_best_streak
  );
end;
$$;

grant execute on function public.compute_child_level(uuid) to anon, authenticated;
