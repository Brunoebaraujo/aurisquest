import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SideQuestCategory } from "@/lib/sideQuests";
import { getTodayQuestDate } from "@/lib/sideQuestDailyLimit";

export type ActiveSideQuest = {
  id: string;
  category: SideQuestCategory;
  mission_key: string;
  title: string;
  reward_auris: number;
  parent_comment: string | null;
  expires_at: string;
  created_at: string;
  quest_date: string;
};

export type SideQuestHistoryItem = {
  id: string;
  category: SideQuestCategory;
  mission_key: string;
  title: string;
  reward_auris: number;
  parent_comment: string | null;
  child_comment: string | null;
  child_photo_url: string | null;
  completed_at: string;
  quest_date?: string;
  status?: "pendente" | "concluida" | "expirada";
};

export const useActiveSideQuest = (token: string | null) => {
  const [active, setActive] = useState<ActiveSideQuest | null>(null);
  const [history, setHistory] = useState<SideQuestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) { setActive(null); setHistory([]); setLoading(false); return; }
    const todayQuestDate = getTodayQuestDate();
    const [a, h] = await Promise.all([
      (supabase.rpc as any)("get_child_side_quest", { _token: token, _quest_date: todayQuestDate }),
      supabase.rpc("get_child_side_quest_history", { _token: token, _limit: 10 }),
    ]);
    setActive((a.data as ActiveSideQuest | null) ?? null);
    setHistory(((h.data as SideQuestHistoryItem[] | null) ?? []));
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  return { active, history, loading, refresh };
};
