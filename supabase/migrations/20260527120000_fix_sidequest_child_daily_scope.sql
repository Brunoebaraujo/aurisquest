-- Scope SideQuest daily limits to each child instead of the whole family.

-- Remove any older family-wide daily uniqueness rules on side_quests.
do $$
declare
  item record;
begin
  for item in
    select conname
    from pg_constraint
    where conrelid = 'public.side_quests'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%family_id%'
      and pg_get_constraintdef(oid) ilike '%created_at%'
      and pg_get_constraintdef(oid) not ilike '%child_id%'
  loop
    execute format('alter table public.side_quests drop constraint if exists %I', item.conname);
  end loop;

  for item in
    select schemaname, indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'side_quests'
      and indexdef ilike '%UNIQUE%'
      and indexdef ilike '%family_id%'
      and indexdef ilike '%created_at%'
      and indexdef not ilike '%child_id%'
  loop
    execute format('drop index if exists %I.%I', item.schemaname, item.indexname);
  end loop;
end $$;

create unique index if not exists side_quests_one_per_child_per_day_idx
  on public.side_quests (child_id, ((created_at at time zone 'America/Sao_Paulo')::date));

create index if not exists side_quests_family_created_child_idx
  on public.side_quests (family_id, created_at, child_id);

create index if not exists side_quests_child_status_expires_idx
  on public.side_quests (child_id, status, expires_at);

-- Replace child-facing RPCs so active and history queries are always child-scoped.
do $$
declare
  item record;
begin
  for item in
    select p.oid::regprocedure::text as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('get_child_side_quest', 'get_child_side_quest_history', 'complete_side_quest')
  loop
    execute format('drop function if exists %s cascade', item.signature);
  end loop;
end $$;

create function public.get_child_side_quest(_token text)
returns jsonb
language plpgsql
security definer
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
    return null;
  end if;

  select to_jsonb(q)
    into v_result
  from (
    select id, category, mission_key, title, reward_auris, parent_comment, expires_at, created_at
    from public.side_quests
    where child_id = v_child_id
      and family_id = v_family_id
      and status = 'pendente'
      and expires_at > now()
    order by created_at desc
    limit 1
  ) q;

  return v_result;
end;
$$;

create function public.get_child_side_quest_history(_token text, _limit integer default 10)
returns jsonb
language plpgsql
security definer
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

  select coalesce(jsonb_agg(to_jsonb(q) order by q.history_at desc), '[]'::jsonb)
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
      coalesce(completed_at, expires_at, created_at) as completed_at,
      status,
      coalesce(completed_at, expires_at, created_at) as history_at
    from public.side_quests
    where child_id = v_child_id
      and family_id = v_family_id
      and status <> 'pendente'
    order by coalesce(completed_at, expires_at, created_at) desc
    limit greatest(coalesce(_limit, 10), 1)
  ) q;

  return v_result;
end;
$$;

create function public.complete_side_quest(
  _token text,
  _side_quest_id uuid,
  _child_comment text default null,
  _child_photo_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_id uuid;
  v_family_id uuid;
  v_quest public.side_quests%rowtype;
begin
  select vt.child_id, vt.family_id
    into v_child_id, v_family_id
  from public.validate_child_token(_token) vt
  limit 1;

  if v_child_id is null then
    return jsonb_build_object('ok', false, 'error', 'Sessao invalida.');
  end if;

  update public.side_quests
  set
    status = 'concluida',
    completed_at = now(),
    child_comment = nullif(btrim(coalesce(_child_comment, '')), ''),
    child_photo_url = nullif(btrim(coalesce(_child_photo_url, '')), '')
  where id = _side_quest_id
    and child_id = v_child_id
    and family_id = v_family_id
    and status = 'pendente'
    and expires_at > now()
  returning * into v_quest;

  if v_quest.id is null then
    return jsonb_build_object('ok', false, 'error', 'SideQuest indisponivel para esta crianca.');
  end if;

  perform public.evaluate_cosmetic_unlocks(v_child_id);

  return jsonb_build_object(
    'ok', true,
    'side_quest_id', v_quest.id,
    'child_id', v_quest.child_id,
    'reward_auris', v_quest.reward_auris,
    'completed_at', v_quest.completed_at
  );
end;
$$;
