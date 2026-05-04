
-- Backfill: corrige submissões existentes com reward_auris = 0
UPDATE public.submissions s
SET reward_auris = a.reward_auris
FROM public.activities a
WHERE s.activity_id = a.id
  AND s.reward_auris = 0
  AND a.reward_auris > 0;

-- Trigger de segurança: se reward_auris vier 0, herda da activity
CREATE OR REPLACE FUNCTION public.set_submission_reward_auris()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.reward_auris, 0) = 0 AND NEW.activity_id IS NOT NULL THEN
    SELECT COALESCE(reward_auris, 0) INTO NEW.reward_auris
    FROM public.activities WHERE id = NEW.activity_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_submission_reward_auris ON public.submissions;
CREATE TRIGGER trg_set_submission_reward_auris
BEFORE INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.set_submission_reward_auris();
