drop function if exists public.get_child_side_quest(text);

create function public.get_child_side_quest(_token text, _quest_date date default null)
returns jsonb
language plpgsql
stable security definer
set search_path = public
as $$
declare
  v_child_id uuid;
  v_family_id uuid;
  v_quest_date date := coalesce(_quest_date, (now() at time zone 'America/Sao_Paulo')::date);
  v_row public.side_quests;
begin
  select vt.child_id, vt.family_id
    into v_child_id, v_family_id
  from public.validate_child_token(_token) vt
  limit 1;

  if v_child_id is null then
    return null;
  end if;

  update public.side_quests
  set status = 'expirada'
  where family_id = v_family_id
    and child_id = v_child_id
    and status = 'pendente'
    and expires_at <= now();

  select * into v_row
  from public.side_quests
  where family_id = v_family_id
    and child_id = v_child_id
    and quest_date = v_quest_date
    and status = 'pendente'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'category', v_row.category,
    'mission_key', v_row.mission_key,
    'title', v_row.title,
    'reward_auris', v_row.reward_auris,
    'parent_comment', v_row.parent_comment,
    'expires_at', v_row.expires_at,
    'created_at', v_row.created_at,
    'quest_date', v_row.quest_date
  );
end;
$$;