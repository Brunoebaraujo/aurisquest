import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type RevealReward = {
  kind: "avatar" | "item";
  id: string;
  name: string;
  description?: string | null;
  image_url: string;
  rarity: "comum" | "raro" | "epico" | "lendario";
  category: string;
};

const RARITY_LABEL: Record<RevealReward["rarity"], string> = {
  comum: "Comum", raro: "Raro", epico: "Épico", lendario: "Lendário",
};

const RARITY_GLOW: Record<RevealReward["rarity"], string> = {
  comum: "from-emerald-400/60 via-emerald-300/30 to-transparent",
  raro: "from-sky-400/70 via-sky-300/40 to-transparent",
  epico: "from-violet-500/70 via-fuchsia-400/40 to-transparent",
  lendario: "from-amber-400/80 via-orange-400/50 to-transparent",
};

const RARITY_RING: Record<RevealReward["rarity"], string> = {
  comum: "ring-emerald-400/60",
  raro: "ring-sky-400/70",
  epico: "ring-violet-400/80",
  lendario: "ring-amber-400/90",
};

const CATEGORY_LABEL: Record<string, string> = {
  avatar: "Avatar", elmo: "Elmo", armadura: "Armadura", arma: "Arma",
  pet: "Pet", aura: "Aura", moldura: "Moldura", badge: "Badge",
};

export function RewardRevealModal({
  rewards,
  onClose,
}: {
  rewards: RevealReward[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"crystal" | "shatter" | "reveal">("crystal");
  const open = rewards.length > 0;
  const current = rewards[index];

  useEffect(() => {
    if (!open) return;
    setPhase("crystal");
    const t1 = setTimeout(() => setPhase("shatter"), 1100);
    const t2 = setTimeout(() => setPhase("reveal"), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [index, open]);

  const particles = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      id: i,
      angle: (i / 14) * Math.PI * 2,
      distance: 80 + Math.random() * 120,
      delay: Math.random() * 0.15,
      size: 6 + Math.random() * 10,
    })),
    [index],
  );

  if (!current) return null;
  const isLast = index >= rewards.length - 1;

  const next = () => {
    if (isLast) onClose();
    else setIndex(i => i + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-gradient-to-b from-[#0b1026] via-[#1a1442] to-[#2a0f3d] text-white">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-50 rounded-full p-1.5 bg-white/10 hover:bg-white/20 transition"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative h-[480px] flex flex-col items-center justify-center overflow-hidden">
          {/* Background starfield */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white/60"
                style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
                animate={{ opacity: [0.2, 0.9, 0.2] }}
                transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>

          {/* Rarity radial glow */}
          <div
            className={`absolute inset-0 bg-gradient-radial pointer-events-none transition-opacity duration-700 ${phase === "reveal" ? "opacity-100" : "opacity-40"}`}
            style={{
              backgroundImage: `radial-gradient(circle at center, var(--tw-gradient-stops))`,
            }}
          >
            <div className={`absolute inset-0 bg-gradient-radial bg-gradient-to-b ${RARITY_GLOW[current.rarity]}`} />
          </div>

          {/* Crystal stage */}
          <AnimatePresence mode="wait">
            {phase !== "reveal" && (
              <motion.div
                key="crystal"
                initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                animate={
                  phase === "crystal"
                    ? { scale: [0.6, 1, 1.05], opacity: 1, rotate: [0, -3, 3, 0], y: [0, -8, 0] }
                    : { scale: 1.4, opacity: 0 }
                }
                exit={{ opacity: 0 }}
                transition={
                  phase === "crystal"
                    ? { duration: 1, ease: "easeOut", rotate: { duration: 1.2, repeat: Infinity, repeatType: "mirror" } }
                    : { duration: 0.5 }
                }
                className="relative z-10"
              >
                <CrystalSVG />
                {/* Pulse halo */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ boxShadow: [
                    "0 0 30px 10px rgba(168,85,247,0.4)",
                    "0 0 60px 25px rgba(168,85,247,0.7)",
                    "0 0 30px 10px rgba(168,85,247,0.4)",
                  ] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              </motion.div>
            )}

            {/* Shatter particles */}
            {phase === "shatter" && (
              <motion.div key="shatter" className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {particles.map(p => (
                  <motion.div
                    key={p.id}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos(p.angle) * p.distance,
                      y: Math.sin(p.angle) * p.distance,
                      opacity: 0,
                      scale: 0.3,
                      rotate: 360,
                    }}
                    transition={{ duration: 0.7, delay: p.delay, ease: "easeOut" }}
                    style={{ width: p.size, height: p.size }}
                    className="absolute rounded-sm bg-gradient-to-br from-fuchsia-300 to-amber-300 shadow-[0_0_12px_rgba(244,114,182,0.9)]"
                  />
                ))}
              </motion.div>
            )}

            {/* Reveal */}
            {phase === "reveal" && (
              <motion.div
                key="reveal"
                initial={{ scale: 0.4, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="relative z-10 flex flex-col items-center text-center px-6"
              >
                <div className="text-xs uppercase tracking-[0.3em] text-white/70 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Recompensa desbloqueada
                </div>

                <div className={`relative mt-3 w-44 h-44 rounded-3xl bg-white/5 backdrop-blur ring-4 ${RARITY_RING[current.rarity]} flex items-center justify-center overflow-hidden`}>
                  {/* Rotating shine */}
                  <motion.div
                    className="absolute inset-[-25%] bg-gradient-conic from-white/0 via-white/30 to-white/0"
                    style={{ backgroundImage: "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.35), transparent 40%)" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  />
                  <img
                    src={current.image_url}
                    alt={current.name}
                    className="relative w-36 h-36 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                  />
                </div>

                <Badge variant="outline" className="mt-3 bg-white/10 text-white border-white/30 backdrop-blur">
                  {CATEGORY_LABEL[current.category] ?? current.category} · {RARITY_LABEL[current.rarity]}
                </Badge>

                <h2 className="mt-3 font-display text-2xl font-bold drop-shadow">{current.name}</h2>
                {current.description && (
                  <p className="text-sm text-white/75 mt-1 max-w-xs">{current.description}</p>
                )}

                <Button
                  onClick={next}
                  size="lg"
                  className="mt-6 bg-white text-[#1a1442] hover:bg-white/90 font-bold rounded-full px-8 shadow-lg"
                >
                  {isLast ? "Continuar" : `Próxima (${index + 2}/${rewards.length})`}
                </Button>

                {rewards.length > 1 && (
                  <div className="absolute -bottom-1 left-0 right-0 flex justify-center gap-1.5">
                    {rewards.map((_, i) => (
                      <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CrystalSVG() {
  return (
    <svg width="120" height="160" viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_30px_rgba(168,85,247,0.7)]">
      <defs>
        <linearGradient id="cryst-face1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="cryst-face2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="cryst-face3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbcfe8" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
      </defs>
      <polygon points="60,5 95,55 60,155 25,55" fill="url(#cryst-face1)" opacity="0.95" />
      <polygon points="60,5 95,55 60,55" fill="url(#cryst-face3)" opacity="0.9" />
      <polygon points="60,5 25,55 60,55" fill="url(#cryst-face2)" opacity="0.85" />
      <polygon points="60,55 95,55 60,155" fill="url(#cryst-face2)" opacity="0.7" />
      <polygon points="60,55 25,55 60,155" fill="url(#cryst-face1)" opacity="0.55" />
      <polyline points="60,5 60,155" stroke="white" strokeOpacity="0.4" strokeWidth="1" />
    </svg>
  );
}
