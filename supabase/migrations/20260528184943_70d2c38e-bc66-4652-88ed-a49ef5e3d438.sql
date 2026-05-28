ALTER TABLE public.side_quests ADD COLUMN IF NOT EXISTS quest_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date;
UPDATE public.side_quests SET quest_date = (created_at AT TIME ZONE 'UTC')::date;
CREATE INDEX IF NOT EXISTS idx_side_quests_child_quest_date ON public.side_quests(child_id, quest_date);