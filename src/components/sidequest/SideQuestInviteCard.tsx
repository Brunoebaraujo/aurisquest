import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Feather, Sparkles } from "lucide-react";
import { CreateSideQuestDialog } from "./CreateSideQuestDialog";

type KidRow = { id: string; name: string };
type TodayRow = { child_id: string };

const getTodayBounds = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

export const SideQuestInviteCard = () => {
  const { profile } = useAuth();
  const [kids, setKids] = useState<KidRow[]>([]);
  const [blockedChildIds, setBlockedChildIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [defaultChildId, setDefaultChildId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.family_id) return;
    const { start, end } = getTodayBounds();
    const [kidsRes, todayRes] = await Promise.all([
      supabase.from("children").select("id, name").eq("family_id", profile.family_id).eq("active", true),
      supabase
        .from("side_quests")
        .select("child_id")
        .eq("family_id", profile.family_id)
        .gte("created_at", start)
        .lt("created_at", end),
    ]);
    setKids((kidsRes.data ?? []) as KidRow[]);
    setBlockedChildIds(new Set(((todayRes.data ?? []) as TodayRow[]).map(r => r.child_id)));
  }, [profile?.family_id]);

  useEffect(() => { load(); }, [load]);

  if (kids.length === 0) return null;
  const availableKids = kids.filter(k => !blockedChildIds.has(k.id));
  if (availableKids.length === 0) return null;

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
