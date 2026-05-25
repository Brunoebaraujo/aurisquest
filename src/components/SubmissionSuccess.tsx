import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { AuriIcon } from "@/components/AuriIcon";
import { Sparkles } from "lucide-react";
import { ExitChildModeDialog } from "@/components/ExitChildModeDialog";

type Props = {
  open: boolean;
  onClose: () => void;
  /** True when the parent picked the child (sharedMode). Shows "Voltar ao modo responsável". */
  sharedMode?: boolean;
};

export const SubmissionSuccess = ({ open, onClose, sharedMode }: Props) => {
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fire = () => {
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#7dd3fc", "#38bdf8", "#0ea5e9", "#a78bfa", "#fbbf24"],
      });
    };
    fire();
    const t1 = setTimeout(fire, 350);
    const t2 = setTimeout(fire, 750);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-glow overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-white to-blue-100 -z-10" />
          <div className="flex flex-col items-center text-center py-4">
            <div className="relative">
              <div className="absolute inset-0 blur-2xl bg-sky-300/50 rounded-full" />
              <AuriIcon size={120} animate className="relative" />
            </div>
            <h2 className="font-display font-bold text-3xl mt-4 text-foreground">
              Tarefa enviada!
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xs">
              Agora chame seu responsável para revisar sua tarefa.
            </p>
            <div className="flex items-center gap-1 text-amber-500 mt-3">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Você é demais!</span>
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="flex flex-col gap-2 w-full mt-6">
              {sharedMode ? (
                <>
                  <Button
                    size="lg"
                    className="w-full rounded-2xl text-base h-12"
                    onClick={() => setExitOpen(true)}
                  >
                    Voltar ao modo responsável
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full rounded-2xl text-base h-12"
                    onClick={onClose}
                  >
                    Fazer outra tarefa
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  className="w-full rounded-2xl text-base h-12"
                  onClick={onClose}
                >
                  Fazer outra tarefa
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ExitChildModeDialog open={exitOpen} onOpenChange={setExitOpen} />
    </>
  );
};

export default SubmissionSuccess;
