drop index if exists public.uniq_side_quests_completed_mission;

create or replace function public.get_child_side_quest_history(_token text, _limit integer default 10)
returns jsonb
language plpgsql
stable security definer
set search_path = public
as $$
declare
  v_child_id uuid;
  v_family_id uuid;
  v_result jsonb;
begin
  select vt.child_id, vt.family_id
    into v_child_id, v_family_id
  from public.validate_child_token(_token) vt
  limit 1;

  if v_child_id is null then
    return '[]'::jsonb;
  end if;

  update public.side_quests
  set status = 'expirada'
  where family_id = v_family_id
    and child_id = v_child_id
    and status = 'pendente'
    and expires_at <= now();

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'category', category,
    'mission_key', mission_key,
    'title', title,
    'reward_auris', reward_auris,
    'parent_comment', parent_comment,
    'child_comment', child_comment,
    'child_photo_url', child_photo_url,
    'completed_at', history_at,
    'quest_date', quest_date,
    'status', status
  ) order by history_at desc), '[]'::jsonb)
  into v_result
  from (
    select
      id,
      category,
      mission_key,
      title,
      reward_auris,
      parent_comment,
      child_comment,
      child_photo_url,
      coalesce(completed_at, expires_at, created_at) as history_at,
      quest_date,
      status
    from public.side_quests
    where family_id = v_family_id
      and child_id = v_child_id
      and status <> 'pendente'
    order by coalesce(completed_at, expires_at, created_at) desc
    limit greatest(coalesce(_limit, 10), 1)
  ) s;

  return v_result;
end;
$$;