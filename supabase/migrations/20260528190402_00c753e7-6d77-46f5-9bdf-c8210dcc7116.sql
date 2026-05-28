drop index if exists public.uniq_side_quests_active_per_child;
drop index if exists public.side_quests_one_per_child_per_day_idx;
drop index if exists public.side_quests_one_per_child_per_day;

update public.side_quests
set status = 'expirada'
where status = 'pendente'
  and expires_at <= now();

update public.side_quests
set quest_date = (created_at at time zone 'America/Sao_Paulo')::date
where quest_date is null;

alter table public.side_quests
  alter column quest_date set not null,
  alter column quest_date set default (now() at time zone 'America/Sao_Paulo')::date;

create unique index side_quests_one_per_child_per_day
on public.side_quests (family_id, child_id, quest_date);

create index if not exists side_quests_lookup_by_daily_rule_idx
on public.side_quests (family_id, child_id, quest_date, status);

create or replace function public.get_child_side_quest(_token text)
returns jsonb
language plpgsql
stable security definer
set search_path = public
as $$
declare
  v_child_id uuid;
  v_family_id uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
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
    and quest_date = v_today
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