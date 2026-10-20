import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GuardianPhase } from "@/config/guardianTourSteps";

export type TutorialStatus = "not_started" | "in_progress" | "completed" | "dismissed";

export type GuardianProgress = {
  tutorial_version: string;
  current_phase: GuardianPhase;
  current_step: number;
  status: TutorialStatus;
  updated_at: string;
};

const VERSION = "first-journey-v2";

export const useGuardianTour = (userId: string | undefined, phase: GuardianPhase) => {
  const [progress, setProgress] = useState<GuardianProgress | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  const load = useCallback(async () => {
    if (!userId) { setProgress(null); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("guardian_tutorial_progress")
      .select("tutorial_version, current_phase, current_step, status, updated_at")
      .eq("user_id", userId).maybeSingle();
    if (!error && data) setProgress(data as GuardianProgress);
    else if (!error) setProgress(null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (next: Partial<Omit<GuardianProgress, "updated_at">>) => {
    if (!userId) return false;
    const base: GuardianProgress = progress ?? {
      tutorial_version: VERSION,
      current_phase: phase,
      current_step: 0,
      status: "not_started",
      updated_at: new Date().toISOString(),
    };
    const payload = {
      user_id: userId,
      ...base,
      ...next,
      tutorial_version: VERSION,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("guardian_tutorial_progress").upsert(payload);
    if (error) return false;
    setProgress(payload as GuardianProgress);
    return true;
  }, [phase, progress, userId]);

  const restart = useCallback(() => save({ current_phase: "app", current_step: 0, status: "not_started" }), [save]);
  const dismiss = useCallback(() => save({ current_phase: phase, status: "dismissed" }), [phase, save]);
  const complete = useCallback(() => save({ current_phase: phase, status: "completed" }), [phase, save]);

  return { progress, loading, load, save, restart, dismiss, complete };
};
