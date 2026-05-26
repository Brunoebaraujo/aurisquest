import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Sparkles, X, CheckCircle2, ImagePlus } from "lucide-react";
import { findMission, SIDE_QUEST_CATEGORIES } from "@/lib/sideQuests";
import type { ActiveSideQuest } from "@/hooks/useActiveSideQuest";

type Props = {
  quest: ActiveSideQuest;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy?: boolean;
  onConfirm: (payload: { comment: string | null; file: File | null }) => void | Promise<void>;
};

const MAX = 120;

export const CompleteSideQuestDialog = ({ quest, open, onOpenChange, busy, onConfirm }: Props) => {
  const meta = findMission(quest.mission_key);
  const cat = meta?.category ?? SIDE_QUEST_CATEGORIES[quest.category];
  const emoji = meta?.mission.emoji ?? cat.emoji;

  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setComment(""); setFile(null); setPreview(null); setShowError(false); };

  const handlePick = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
    if (f) setShowError(false);
  };

  const canSubmit = comment.trim().length > 0 || !!file;

  const handleConfirm = async () => {
    if (!canSubmit) { setShowError(true); return; }
    await onConfirm({ comment: comment.trim() ? comment.trim().slice(0, MAX) : null, file });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent
        className={`max-w-md p-0 overflow-hidden border-0 rounded-[2rem] bg-gradient-to-br ${cat.gradient} shadow-glow ring-2 ${cat.ring}`}
      >
        <div className="rounded-[1.85rem] bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/90 p-5 sm:p-6 relative overflow-hidden">
          <Sparkles className="absolute top-3 left-3 w-4 h-4 text-amber-400/60" />
          <Sparkles className="absolute top-4 right-10 w-3 h-3 text-amber-400/60" />
          <Sparkles className="absolute bottom-3 right-4 w-3 h-3 text-amber-400/60" />

          <div className="text-center">
            <div className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[11px] font-bold ${cat.badge} shadow-sm`}>
              <Sparkles className="w-3 h-3" /> Registrar pergaminho
            </div>
            <DialogTitle className="mt-2 font-display font-bold text-xl text-amber-950 leading-tight">
              Como foi sua aventura hoje? ✨
            </DialogTitle>
            <DialogDescription className="text-amber-900/70 text-xs mt-1">
              <span className="mr-1">{emoji}</span>{quest.title}
            </DialogDescription>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-amber-900 ml-1">Conte o que aconteceu</label>
              <Textarea
                value={comment}
                onChange={(e) => { setComment(e.target.value.slice(0, MAX)); if (e.target.value) setShowError(false); }}
                placeholder="Conte o que aconteceu..."
                maxLength={MAX}
                className="mt-1 rounded-2xl bg-white/80 border-amber-200 focus-visible:ring-amber-400 min-h-[80px] text-sm"
              />
              <div className="text-[10px] text-amber-900/60 text-right mt-0.5">{comment.length}/{MAX}</div>
            </div>

            <div>
              <label className="text-xs font-bold text-amber-900 ml-1">Envie uma foto da missão 📸</label>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
              />
              {preview ? (
                <div className="mt-1 relative rounded-2xl overflow-hidden ring-2 ring-amber-200 bg-white/60">
                  <img src={preview} alt="Prévia" className="w-full max-h-56 object-contain" />
                  <button
                    type="button"
                    onClick={() => handlePick(null)}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md"
                    aria-label="Remover foto"
                  >
                    <X className="w-4 h-4 text-amber-900" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-1 w-full rounded-2xl border-2 border-dashed border-amber-300 bg-white/60 hover:bg-white/90 py-4 flex flex-col items-center justify-center gap-1 text-amber-900 transition-colors"
                >
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-sm font-display font-semibold">Enviar foto</span>
                  <span className="text-[10px] text-amber-900/60">câmera ou galeria</span>
                </button>
              )}
            </div>

            {showError && (
              <div className="rounded-2xl bg-rose-100/80 text-rose-700 text-xs font-semibold text-center py-2 px-3">
                Conte como foi sua missão ou envie uma foto ✨
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="rounded-full text-amber-900 hover:bg-amber-100"
            >
              Voltar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={busy}
              className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-display font-bold shadow-md"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {busy ? "Registrando..." : "Concluir missão"}
            </Button>
          </div>

          <p className="text-center text-[10px] text-amber-900/60 mt-2">
            Seu pergaminho será registrado no histórico ✨
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteSideQuestDialog;
