import type { TutorialStatus } from "@/hooks/useGuardianTour";

export const clampGuardianStep = (step: number, total: number) => Math.max(0, Math.min(step, Math.max(total - 1, 0)));

export const nextGuardianStatus = (step: number, total: number): TutorialStatus =>
  step >= total - 1 ? "completed" : "in_progress";

export const guardianRestart = () => ({ current_phase: "app" as const, current_step: 0, status: "not_started" as const });

export const guardianCanAutoStart = (status: TutorialStatus | undefined, isNewOnboarding: boolean) =>
  isNewOnboarding || status === "not_started";
