import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Hourglass, Sparkles, Feather, CheckCircle2 } from "lucide-react";
import { findMission, SIDE_QUEST_CATEGORIES } from "@/lib/sideQuests";
import type { ActiveSideQuest } from "@/hooks/useActiveSideQuest";
import { AuriIcon } from "@/components/AuriIcon";

const pad = (n: number) => String(n).padStart(2, "0");
const formatRemaining = (ms: number) => {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

type Props = {
  quest: ActiveSideQuest;
  onRequestComplete: () => void;
  busy?: boolean;
};

export const SideQuestScroll = ({ quest, onRequestComplete, busy }: Props) => {
  const meta = findMission(quest.mission_key);
  const cat = meta?.category ?? SIDE_QUEST_CATEGORIES[quest.category];
  const emoji = meta?.mission.emoji ?? cat.emoji;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const remainingMs = new Date(quest.expires_at).getTime() - now;
  const expiresAt = new Date(quest.expires_at);
  const expiresLabel = `Expira ${expiresAt.toLocaleDateString("pt-BR") === new Date().toLocaleDateString("pt-BR") ? "hoje" : "em"} às ${pad(expiresAt.getHours())}:${pad(expiresAt.getMinutes())}`;

  return (
    <div className="relative animate-pop-in">
      {/* Decorative glow */}
      <div className="absolute -inset-2 bg-gradient-to-r from-amber-300/40 via-yellow-200/30 to-amber-300/40 blur-2xl rounded-[3rem] pointer-events-none" />

      <div className={`relative rounded-[2.25rem] bg-gradient-to-br ${cat.gradient} p-1 shadow-glow ring-2 ${cat.ring}`}>
        <div className="rounded-[2rem] bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/80 px-4 py-4 sm:px-6 sm:py-5 relative overflow-hidden">
          {/* corner sparkles */}
          <Sparkles className="absolute top-2 left-2 w-4 h-4 text-amber-400/60" />
          <Sparkles className="absolute top-3 right-3 w-3 h-3 text-amber-400/60" />
          <Sparkles className="absolute bottom-2 right-6 w-3 h-3 text-amber-400/60" />

          <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4">
            {/* Banner badge */}
            <div className={`shrink-0 w-20 sm:w-24 rounded-2xl bg-gradient-to-b ${cat.gradient} ring-2 ${cat.ring} flex flex-col items-center justify-center py-3 shadow-md`}>
              <Feather className="w-7 h-7 text-amber-700" />
              <div className="text-3xl mt-1">{cat.emoji}</div>
            </div>

            {/* Center content */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold ${cat.badge} shadow-sm`}>
                <Sparkles className="w-3 h-3" /> Side Quest do dia
              </div>
              <h3 className="mt-1.5 font-display font-bold text-lg sm:text-xl text-amber-950 leading-tight">
                <span className="mr-1">{emoji}</span>{quest.title}
              </h3>
              <p className="text-xs text-amber-900/70 mt-0.5">
                ✨ Missão especial — vale <span className="font-bold inline-flex items-center gap-0.5"><AuriIcon size={11} /> +{quest.reward_auris} Auris</span>
              </p>
              {quest.parent_comment && (
                <div className="mt-2 inline-block max-w-full text-xs italic text-amber-900/80 bg-white/60 rounded-xl px-3 py-1.5 border border-amber-200">
                  💌 {quest.parent_comment}
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="shrink-0 sm:w-44 rounded-2xl bg-white/80 backdrop-blur ring-1 ring-amber-200 p-3 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wide text-amber-700">
                <Hourglass className="w-3.5 h-3.5" /> Tempo restante
              </div>
              <div className="font-display font-bold text-2xl text-amber-950 tabular-nums mt-0.5">
                {formatRemaining(remainingMs)}
              </div>
              <div className="text-[10px] text-amber-900/70 mt-0.5">{expiresLabel}</div>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <Button
              onClick={onComplete}
              disabled={busy || remainingMs <= 0}
              className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-display font-bold shadow-md"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {busy ? "Enviando..." : "Marcar como concluída"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideQuestScroll;
