-- Completed Daily Sidequests must include evidence.
-- This preserves the existing per-child daily limit, family scope, and RLS policies.
-- NOT VALID avoids failing older completed rows that may not have evidence, while still enforcing new inserts/updates.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'side_quests_completion_evidence_required'
  ) then
    alter table public.side_quests
      add constraint side_quests_completion_evidence_required
      check (
        status <> 'concluida'
        or child_photo_url is not null
        or length(trim(coalesce(child_comment, ''))) >= 50
      ) not valid;
  end if;
end $$;
