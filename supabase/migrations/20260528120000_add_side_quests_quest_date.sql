alter table public.side_quests
  add column if not exists quest_date date;

update public.side_quests
set quest_date = (created_at at time zone 'America/Sao_Paulo')::date
where quest_date is null;

alter table public.side_quests
  alter column quest_date set not null;

create unique index if not exists side_quests_one_per_child_per_day
on public.side_quests (family_id, child_id, quest_date);
