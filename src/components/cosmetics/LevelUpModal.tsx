import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function LevelUpModal({
  open,
  onClose,
  childName,
  newLevel,
  newTitle,
}: {
  open: boolean;
  onClose: () => void;
  childName: string;
  newLevel: number;
  newTitle?: string;
}) {
  useEffect(() => {
    if (!open) return;
    // TODO: tocar som de level-up
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm border-0 bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground overflow-hidden">
        <div className="relative py-6 text-center space-y-4">
          {/* Halo */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,white_0%,transparent_60%)] opacity-20 animate-pulse" />
          </div>

          {/* Selo do nível */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-reward shadow-reward flex flex-col items-center justify-center text-accent-foreground border-4 border-background animate-scale-in">
            <Sparkles className="w-5 h-5" />
            <div className="font-display font-bold text-3xl leading-none">{newLevel}</div>
          </div>

          <div className="relative space-y-1 animate-fade-in">
            <div className="font-display font-bold text-3xl tracking-wide">Level Up!</div>
            <p className="text-base opacity-95">
              {childName} agora é um <span className="font-bold">{newTitle ?? "Aventureiro"}</span>!
            </p>
          </div>

          <Button onClick={onClose} variant="secondary" className="relative w-full">
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
