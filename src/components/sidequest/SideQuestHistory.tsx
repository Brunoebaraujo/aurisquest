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
            return (
              <div key={it.id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-violet-50 to-amber-50 ring-1 ring-violet-100">
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
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SideQuestHistory;
