import { Card, CardContent } from "@/components/ui/card";
import { ScrollText, CheckCircle2 } from "lucide-react";
import { findMission, SIDE_QUEST_CATEGORIES } from "@/lib/sideQuests";
import type { SideQuestHistoryItem } from "@/hooks/useActiveSideQuest";
import { AuriIcon } from "@/components/AuriIcon";

type Props = { items: SideQuestHistoryItem[] };

export const SideQuestHistory = ({ items }: Props) => {
  if (items.length === 0) return null;
  return (
    <Card className="border-0 shadow-card rounded-3xl ring-1 ring-violet-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-violet-500" /> Minhas Side-Quests
          </h2>
        </div>
        <div className="space-y-2">
          {items.map(it => {
            const meta = findMission(it.mission_key);
            const cat = meta?.category ?? SIDE_QUEST_CATEGORIES[it.category];
            const emoji = meta?.mission.emoji ?? cat.emoji;
            const d = new Date(it.completed_at);
            const hasExtras = !!(it.parent_comment || it.child_comment || it.child_photo_url);
            return (
              <div key={it.id} className="p-2.5 rounded-2xl bg-gradient-to-r from-violet-50 to-amber-50 ring-1 ring-violet-100">
                <div className="flex items-center gap-3">
                  <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-b ${cat.gradient} ring-2 ${cat.ring}`}>
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-sm leading-tight truncate">{it.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {cat.label} · {d.toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="font-display font-bold text-sm inline-flex items-center gap-0.5">
                      <AuriIcon size={12} /> {it.reward_auris}
                    </span>
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                </div>

                {hasExtras && (
                  <div className="mt-2 pl-14 flex flex-wrap items-start gap-2">
                    {it.child_photo_url && (
                      <a
                        href={it.child_photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 block rounded-xl overflow-hidden ring-2 ring-amber-200 hover:ring-amber-400 transition"
                      >
                        <img src={it.child_photo_url} alt="Foto da missão" className="w-16 h-16 object-cover" />
                      </a>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      {it.parent_comment && (
                        <div className="text-[11px] italic text-amber-900/80 bg-white/70 rounded-xl px-2.5 py-1 border border-amber-200">
                          💌 {it.parent_comment}
                        </div>
                      )}
                      {it.child_comment && (
                        <div className="text-[11px] text-violet-900 bg-white/70 rounded-xl px-2.5 py-1 border border-violet-200">
                          🗯️ {it.child_comment}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SideQuestHistory;
