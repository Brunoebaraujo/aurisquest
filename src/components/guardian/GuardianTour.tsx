import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GuardianWizard } from "./GuardianWizard";
import { GuardianSpeechBubble } from "./GuardianSpeechBubble";
import { GuardianSpotlight } from "./GuardianSpotlight";
import { guardianStepsFor, type GuardianPhase } from "@/config/guardianTourSteps";
import { useGuardianTour } from "@/hooks/useGuardianTour";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  phase: GuardianPhase;
  externalStep?: number;
  onExternalStepChange?: (step: number) => void;
};

const targetExists = (target: string) => Boolean(document.querySelector(`[data-tour="${target}"]`));

export const GuardianTour = ({ phase, externalStep, onExternalStepChange }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { progress, loading, save, dismiss, complete, load } = useGuardianTour(user?.id, phase);
  const steps = useMemo(() => guardianStepsFor(phase), [phase]);
  const [targetPresent, setTargetPresent] = useState(false);
  const isExternal = typeof externalStep === "number";
  const currentStep = Math.max(0, Math.min(isExternal ? externalStep! : progress?.current_step ?? 0, steps.length - 1));
  const step = steps[currentStep];

  const isRelevant = !progress || progress.current_phase === phase;
  const active = !loading && isRelevant && progress?.status === "in_progress";
  const offer = !loading && phase === "app" && progress?.current_phase === "app" && progress.status === "not_started";

  useEffect(() => {
    // Onboarding has no separate invitation: its guidance begins with the first form field.
    if (phase === "onboarding" && !loading && !progress && user?.id) {
      void save({ current_phase: "onboarding", current_step: 0, status: "in_progress" });
    }
  }, [loading, phase, progress, save, user?.id]);

  const setStep = useCallback(async (next: number) => {
    const safe = Math.max(0, Math.min(next, steps.length - 1));
    if (isExternal) onExternalStepChange?.(safe);
    await save({ current_phase: phase, current_step: safe, status: "in_progress" });
    const destination = steps[safe]?.route;
    if (destination && pathname !== destination) navigate(destination);
  }, [isExternal, navigate, onExternalStepChange, pathname, phase, save, steps]);

  const begin = useCallback(async () => {
    await save({ current_phase: phase, current_step: 0, status: "in_progress" });
    if (isExternal) onExternalStepChange?.(0);
    const destination = steps[0]?.route;
    if (destination && pathname !== destination) navigate(destination);
  }, [isExternal, navigate, onExternalStepChange, pathname, phase, save, steps]);

  const next = useCallback(async () => {
    if (currentStep === steps.length - 1) { await complete(); return; }
    await setStep(currentStep + 1);
  }, [complete, currentStep, setStep, steps.length]);

  useEffect(() => {
    if (!active) return;
    const update = () => setTargetPresent(targetExists(step.target));
    update();
    const timer = window.setTimeout(update, 300);
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    // Pages can load their target asynchronously, but do not keep retrying forever.
    const stopObserving = window.setTimeout(() => observer.disconnect(), 2500);
    return () => { window.clearTimeout(timer); window.clearTimeout(stopObserving); observer.disconnect(); };
  }, [active, step.target, pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && active) void dismiss(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, dismiss]);

  useEffect(() => {
    const restart = () => { void (async () => { await save({ current_phase: "app", current_step: 0, status: "not_started" }); await load(); })(); };
    window.addEventListener("guardian-tour:restart", restart);
    return () => window.removeEventListener("guardian-tour:restart", restart);
  }, [load, save]);

  if (loading || (!active && !offer)) return null;

  if (offer) return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-50 flex items-end gap-1 sm:right-6" aria-live="polite">
      <GuardianWizard state="idle" />
      <section className="w-[min(20rem,calc(100vw-6rem))] rounded-2xl border bg-card p-3 shadow-xl">
        <p className="text-sm">Seu Reino está pronto. Quer conhecer os principais caminhos com o Guardião?</p>
        <div className="mt-3 flex gap-2"><button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" onClick={() => void begin()}>Começar visita</button><button className="px-2 text-xs text-muted-foreground" onClick={() => void dismiss()}>Agora não</button></div>
      </section>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 pointer-events-none" aria-live="polite">
      {targetPresent && <GuardianSpotlight target={step.target} />}
      <div className="pointer-events-auto fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 flex items-end gap-1 sm:bottom-5 sm:right-6">
        <GuardianWizard state={step.state} />
        <GuardianSpeechBubble
          speech={!targetPresent && step.fallbackSpeech ? step.fallbackSpeech : step.speech}
          step={currentStep}
          total={steps.length}
          canGoBack={currentStep > 0}
          canGoNext
          nextLabel={currentStep === steps.length - 1 ? "Concluir" : "Próximo"}
          onBack={() => void setStep(currentStep - 1)}
          onNext={() => void next()}
          onDismiss={() => void dismiss()}
          onSkip={() => void dismiss()}
          fallbackLabel={!targetPresent ? step.fallbackLabel ?? "Levar até lá" : undefined}
          onFallback={!targetPresent ? () => { if (step.route) navigate(step.route); } : undefined}
        />
      </div>
    </div>
  );
};
