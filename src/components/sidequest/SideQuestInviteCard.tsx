import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Feather, Sparkles } from "lucide-react";
import { CreateSideQuestDialog } from "./CreateSideQuestDialog";
import { getTodayQuestDate } from "@/lib/sideQuestDailyLimit";

type KidRow = { id: string; name: string };
type TodayRow = { child_id: string };

export const SideQuestInviteCard = () => {
  const { profile } = useAuth();
  const [kids, setKids] = useState<KidRow[]>([]);
  const [blockedChildIds, setBlockedChildIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [defaultChildId, setDefaultChildId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.family_id) return;
    const todayQuestDate = getTodayQuestDate();
    const sideQuestsQuery = supabase.from("side_quests") as any;
    const [kidsRes, todayRes] = await Promise.all([
      supabase.from("children").select("id, name").eq("family_id", profile.family_id).eq("active", true),
      sideQuestsQuery
        .select("child_id")
        .eq("family_id", profile.family_id)
        .eq("quest_date", todayQuestDate),
    ]);
    setKids((kidsRes.data ?? []) as KidRow[]);
    setBlockedChildIds(new Set(((todayRes.data ?? []) as TodayRow[]).map(r => r.child_id)));
  }, [profile?.family_id]);

  useEffect(() => { load(); }, [load]);

  if (kids.length === 0) return null;
  const availableKids = kids.filter(k => !blockedChildIds.has(k.id));
  if (availableKids.length === 0) {
    return (
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-300/30 to-yellow-200/20 blur-xl rounded-3xl pointer-events-none" />
        <div className="relative rounded-3xl ring-2 ring-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 p-4 shadow-card flex items-center gap-4">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-100 to-yellow-200 ring-2 ring-amber-300 flex items-center justify-center shadow-md">
            <Sparkles className="w-7 h-7 text-amber-800" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase font-bold tracking-wide text-amber-700 inline-flex items-center gap-1">
              <Feather className="w-3 h-3" /> Side Quest do dia
            </div>
            <p className="text-sm font-medium text-amber-950">
              Todas as crianças já receberam a SideQuest de hoje. Amanhã novas SideQuests estarão disponíveis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-300/40 to-yellow-200/30 blur-xl rounded-3xl pointer-events-none" />
        <div className="relative rounded-3xl ring-2 ring-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 p-4 shadow-card flex items-center gap-4">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-200 to-yellow-300 ring-2 ring-amber-400 flex items-center justify-center shadow-md">
            <Feather className="w-7 h-7 text-amber-800" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase font-bold tracking-wide text-amber-700 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Side Quest do dia
            </div>
            <h3 className="font-display font-bold text-base text-amber-950 leading-tight">Crie a SideQuest do Dia!</h3>
            <p className="text-xs text-amber-900/80">Inspire seu filho com uma missão especial e conceda até 3 Auris!</p>
          </div>
          <Button
            onClick={() => { setDefaultChildId(availableKids[0]?.id ?? null); setOpen(true); }}
            className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold shadow-md"
          >
            Criar SideQuest
          </Button>
        </div>
      </div>

      <CreateSideQuestDialog
        open={open}
        onOpenChange={setOpen}
        children={kids}
        blockedChildIds={blockedChildIds}
        defaultChildId={defaultChildId}
        onCreated={load}
      />
    </>
  );
};

export default SideQuestInviteCard;
