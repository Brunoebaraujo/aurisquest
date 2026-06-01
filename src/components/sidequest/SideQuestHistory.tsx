import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, CheckCircle2, Clock, Hourglass, XCircle } from "lucide-react";
import { findMission, SIDE_QUEST_CATEGORIES } from "@/lib/sideQuests";
import type { SideQuestHistoryItem } from "@/hooks/useActiveSideQuest";
import { AuriIcon } from "@/components/AuriIcon";

type Props = {
  items: SideQuestHistoryItem[];
  showEmptyState?: boolean;
  emptyMessage?: string;
  showStatus?: boolean;
  childName?: string | null;
  title?: string;
};

const statusMeta = {
  concluida: { label: "Aprovada", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  aprovado: { label: "Aprovada", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  pendente: { label: "Aguardando aprovação", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  recusado: { label: "Recusada", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  expirada: { label: "Expirada", icon: Hourglass, className: "bg-muted text-muted-foreground border-border" },
} as const;

export const SideQuestHistory = ({
  items,
  showEmptyState = false,
  emptyMessage = "Nenhuma side-quest registrada ainda.",
  showStatus = false,
  childName,
  title = "Minhas Side-Quests",
}: Props) => {
  if (items.length === 0 && !showEmptyState) return null;

  return (
    <Card className="border-0 shadow-card rounded-3xl ring-1 ring-violet-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-violet-500" /> {title}
          </h2>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {items.map(it => {
              const meta = findMission(it.mission_key);
              const cat = meta?.category ?? SIDE_QUEST_CATEGORIES[it.category];
              const emoji = meta?.mission.emoji ?? cat.emoji;
              const d = new Date(it.completed_at);
              const hasExtras = !!(it.parent_comment || it.child_comment || it.child_photo_url);
              const status = it.status ? statusMeta[it.status] : null;
              const StatusIcon = status?.icon;
              const approved = it.status === "concluida" || it.status === "aprovado";
              return (
                <div key={it.id} className="p-2.5 rounded-2xl bg-gradient-to-r from-violet-50 to-amber-50 ring-1 ring-violet-100">
                  <div className="flex items-center gap-3">
                    <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-b ${cat.gradient} ring-2 ${cat.ring}`}>
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-sm leading-tight truncate">{it.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {childName ? `${childName} · ` : ""}{cat.label} · {d.toLocaleDateString("pt-BR")} às {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-wrap items-center justify-end gap-2">
                      <span className={`font-display font-bold text-sm inline-flex items-center gap-0.5 ${it.status === "recusado" ? "text-muted-foreground line-through" : ""}`}>
                        <AuriIcon size={12} /> {it.reward_auris}
                      </span>
                      {showStatus && status && StatusIcon ? (
                        <Badge variant="outline" className={`gap-1 px-2 py-0.5 text-[11px] ${status.className}`}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                        </Badge>
                      ) : approved ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : status && StatusIcon ? (
                        <StatusIcon className={`w-5 h-5 ${it.status === "recusado" ? "text-destructive" : "text-warning"}`} />
                      ) : null}
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
                          <img src={it.child_photo_url} alt="Foto enviada na Sidequest" className="w-16 h-16 object-cover" />
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
        )}
      </CardContent>
    </Card>
  );
};

export default SideQuestHistory;
