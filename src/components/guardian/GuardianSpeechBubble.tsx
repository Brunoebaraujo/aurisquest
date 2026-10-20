import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  speech: string;
  step: number;
  total: number;
  canGoBack: boolean;
  canGoNext: boolean;
  nextLabel?: string;
  onBack?: () => void;
  onNext?: () => void;
  onDismiss: () => void;
  onSkip: () => void;
  fallbackLabel?: string;
  onFallback?: () => void;
};

export const GuardianSpeechBubble = ({ speech, step, total, canGoBack, canGoNext, nextLabel = "Próximo", onBack, onNext, onDismiss, onSkip, fallbackLabel, onFallback }: Props) => (
  <section className="w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl border bg-card p-3 shadow-xl" role="dialog" aria-label="Orientação do Guardião">
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-card-foreground">{speech}</p>
        <p className="mt-1 text-xs text-muted-foreground">Passo {step + 1} de {total}</p>
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Fechar orientação" onClick={onDismiss}><X size={16} /></Button>
    </div>
    {fallbackLabel && onFallback && <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={onFallback}>{fallbackLabel}</Button>}
    <div className="mt-3 flex items-center gap-2">
      {canGoBack && <Button type="button" variant="outline" size="sm" onClick={onBack}>Voltar</Button>}
      {canGoNext && <Button type="button" variant="hero" size="sm" className="ml-auto" onClick={onNext}>{nextLabel}</Button>}
      <Button type="button" variant="ghost" size="sm" className="ml-auto text-xs" onClick={onSkip}>Pular tutorial</Button>
      <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={onDismiss}>Não mostrar novamente</Button>
    </div>
  </section>
);
