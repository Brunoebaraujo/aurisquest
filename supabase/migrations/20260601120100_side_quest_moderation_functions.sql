create or replace function public.complete_side_quest(
  _token text,
  _side_quest_id uuid,
  _child_comment text default null,
  _child_photo_url text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_quest record;
  v_comment text;
begin
  select child_id, family_id
    into v_session
  from public.validate_child_token(_token)
  limit 1;

  if v_session.child_id is null then
    return json_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select *
    into v_quest
  from public.side_quests
  where id = _side_quest_id
    and child_id = v_session.child_id
    and family_id = v_session.family_id
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'side_quest_not_found');
  end if;

  if v_quest.completed_at is not null then
    return json_build_object(
      'ok', true,
      'status', v_quest.status,
      'reward_auris', v_quest.reward_auris
    );
  end if;

  if v_quest.expires_at < now() then
    update public.side_quests
       set status = 'expirada'
     where id = v_quest.id;

    return json_build_object('ok', false, 'error', 'side_quest_expired');
  end if;

  v_comment := nullif(btrim(coalesce(_child_comment, '')), '');

  update public.side_quests
     set child_comment = v_comment,
         child_photo_url = nullif(btrim(coalesce(_child_photo_url, '')), ''),
         completed_at = now(),
         status = 'pendente'
   where id = v_quest.id
   returning * into v_quest;

  return json_build_object(
    'ok', true,
    'status', v_quest.status,
    'reward_auris', v_quest.reward_auris
  );
end;
$$;

create or replace function public.review_side_quest(
  _side_quest_id uuid,
  _status text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_quest record;
  v_next_status public.side_quest_status;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if _status not in ('aprovado', 'recusado') then
    return json_build_object('ok', false, 'error', 'invalid_status');
  end if;

  select family_id
    into v_family_id
  from public.profiles
  where id = auth.uid();

  if v_family_id is null then
    return json_build_object('ok', false, 'error', 'family_not_found');
  end if;

  select *
    into v_quest
  from public.side_quests
  where id = _side_quest_id
    and family_id = v_family_id
    and completed_at is not null
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'side_quest_not_found');
  end if;

  if v_quest.status not in ('pendente', 'concluida', 'aprovado', 'recusado') then
    return json_build_object('ok', false, 'error', 'side_quest_not_reviewable');
  end if;

  -- Keep the legacy approved value so existing reward/level functions that count
  -- completed side quests continue to treat approved quests as awarded.
  v_next_status := case when _status = 'aprovado' then 'concluida'::public.side_quest_status else 'recusado'::public.side_quest_status end;

  update public.side_quests
     set status = v_next_status
   where id = v_quest.id
   returning * into v_quest;

  perform public.evaluate_cosmetic_unlocks(v_quest.child_id);

  return json_build_object(
    'ok', true,
    'status', v_quest.status,
    'reward_auris', v_quest.reward_auris
  );
end;
$$;

create or replace function public.get_child_side_quest(
  _token text,
  _quest_date date default current_date
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_quest json;
begin
  select child_id, family_id
    into v_session
  from public.validate_child_token(_token)
  limit 1;

  if v_session.child_id is null then
    return null;
  end if;

  select to_json(sq)
    into v_quest
  from public.side_quests sq
  where sq.child_id = v_session.child_id
    and sq.family_id = v_session.family_id
    and sq.quest_date = _quest_date
    and sq.status = 'pendente'
    and sq.completed_at is null
    and sq.expires_at > now()
  order by sq.created_at desc
  limit 1;

  return v_quest;
end;
$$;

create or replace function public.get_child_side_quest_history(
  _token text,
  _limit integer default 10
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_history json;
begin
  select child_id, family_id
    into v_session
  from public.validate_child_token(_token)
  limit 1;

  if v_session.child_id is null then
    return '[]'::json;
  end if;

  select coalesce(json_agg(row_to_json(q)), '[]'::json)
    into v_history
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
      coalesce(completed_at, created_at) as completed_at,
      quest_date,
      status
    from public.side_quests
    where child_id = v_session.child_id
      and family_id = v_session.family_id
      and (
        completed_at is not null
        or status in ('concluida', 'aprovado', 'recusado', 'expirada')
      )
    order by coalesce(completed_at, created_at) desc
    limit greatest(coalesce(_limit, 10), 1)
  ) q;

  return v_history;
end;
$$;

grant execute on function public.review_side_quest(uuid, text) to authenticated;
