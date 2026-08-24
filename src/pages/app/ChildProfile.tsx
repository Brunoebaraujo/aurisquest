import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Trophy, Target, Flame, Sparkles, Eye, CalendarDays } from "lucide-react";
import { formatAuris } from "@/lib/format";
import { AuriIcon } from "@/components/AuriIcon";
import { toast } from "sonner";
import { useFamilyCosmetics } from "@/hooks/useFamilyCosmetics";
import { ParentWardrobeDialog } from "@/components/cosmetics/ParentWardrobeDialog";
import { CharacterSheet, type RealSlotKey } from "@/components/cosmetics/CharacterSheet";
import { SideQuestHistory } from "@/components/sidequest/SideQuestHistory";
import type { SideQuestHistoryItem } from "@/hooks/useActiveSideQuest";
import { spentAurisByChild } from "@/lib/aurisBalance";

type Child = { id: string; name: string; avatar_url: string | null };
type Mission = {
  id: string;
  name: string;
  description: string | null;
  activity_id: string;
  goal_type: "total" | "streak";
  goal_target: number;
  bonus_auris: number;
  medal_url: string | null;
};
type AwardRow = { mission_id: string; awarded_at: string; bonus_auris: number };
type SideQuestHistoryRow = Omit<SideQuestHistoryItem, "completed_at"> & {
  completed_at: string | null;
  created_at?: string;
};

const ChildProfile = () => {
  const { childId } = useParams();
  const nav = useNavigate();
  const { profile } = useAuth();
  const [child, setChild] = useState<Child | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [level, setLevel] = useState<number>(0);
  const [title, setTitle] = useState<string>("Escudeiro");
  const [xpInLevel, setXpInLevel] = useState<number>(0);
  const [xpToNext, setXpToNext] = useState<number>(100);
  const [totalXp, setTotalXp] = useState<number>(0);
  const [nextLevelTotalXp, setNextLevelTotalXp] = useState<number>(100);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [pendingAuris, setPendingAuris] = useState(0);
  const [approvedAuris, setApprovedAuris] = useState(0);
  const [paidAuris, setPaidAuris] = useState(0);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [wardrobeTab, setWardrobeTab] = useState<string | undefined>(undefined);
  const [sideQuestHistory, setSideQuestHistory] = useState<SideQuestHistoryItem[]>([]);
  const [cosmeticsKey, setCosmeticsKey] = useState(0);

  const activitiesRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const rankingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!childId || !profile?.family_id) return;
      const fid = profile.family_id;

      const [c, mList, mp, ma, sq, subs, pays, redemptions] = await Promise.all([
        supabase.from("children").select("id, name, avatar_url").eq("id", childId).maybeSingle(),
        supabase.from("missions").select("*").eq("family_id", fid),
        supabase.from("mission_participants").select("mission_id").eq("child_id", childId).eq("family_id", fid),
        supabase.from("mission_awards").select("mission_id, awarded_at, bonus_auris").eq("child_id", childId).eq("family_id", fid),
        supabase.from("side_quests")
          .select("id, category, mission_key, title, reward_auris, parent_comment, child_comment, child_photo_url, completed_at, created_at, status")
          .eq("child_id", childId)
          .eq("family_id", fid)
          .eq("status", "concluida")
          .order("completed_at", { ascending: false })
          .limit(10),
        supabase.from("submissions").select("status, reward_auris").eq("child_id", childId).eq("family_id", fid),
        supabase.from("payments").select("auris_redeemed").eq("child_id", childId).eq("family_id", fid),
        supabase.from("reward_redemptions").select("child_id, auris_cost, status, legacy_payment_id").eq("child_id", childId).eq("family_id", fid),
      ]);
      setChild(c.data as Child);
      const myMissionIds = new Set((mp.data ?? []).map((r: any) => r.mission_id));
      const my = ((mList.data ?? []) as Mission[]).filter(m => myMissionIds.has(m.id));
      setMissions(my);
      setAwards((ma.data ?? []) as AwardRow[]);
      setSideQuestHistory(((sq.data ?? []) as SideQuestHistoryRow[]).map(({ created_at, completed_at, ...item }) => ({
        ...item,
        completed_at: completed_at ?? created_at ?? new Date(0).toISOString(),
      })));

      let pend = 0, appr = 0;
      (subs.data ?? []).forEach((s: any) => {
        if (s.status === "pendente") pend += s.reward_auris ?? 0;
        else if (s.status === "aprovado") appr += s.reward_auris ?? 0;
      });
      (ma.data ?? []).forEach((a: any) => { appr += a.bonus_auris ?? 0; });
      const paid = spentAurisByChild((pays.data ?? []).map(p => ({ ...p, child_id: childId })), redemptions.data ?? []).get(childId) ?? 0;
      setPendingAuris(pend);
      setApprovedAuris(appr);
      setPaidAuris(paid);

      // compute progress per mission
      const prog: Record<string, number> = {};
      let topStreak = 0;
      for (const m of my) {
        if (m.goal_type === "total") {
          const { count } = await supabase.from("submissions")
            .select("id", { count: "exact", head: true })
            .eq("child_id", childId).eq("activity_id", m.activity_id).eq("status", "aprovado");
          prog[m.id] = count ?? 0;
        } else {
          const { data } = await supabase.from("submissions")
            .select("completed_at")
            .eq("child_id", childId).eq("activity_id", m.activity_id).eq("status", "aprovado")
            .order("completed_at", { ascending: false }).limit(60);
          const days = new Set((data ?? []).map((r: any) =>
            new Date(r.completed_at).toLocaleDateString("pt-BR")));
          let s = 0;
          const cur = new Date();
          for (let i = 0; i < 60; i++) {
            const k = cur.toLocaleDateString("pt-BR");
            if (days.has(k)) { s++; cur.setDate(cur.getDate() - 1); } else break;
          }
          prog[m.id] = s;
          if (s > topStreak) topStreak = s;
        }
      }
      setProgress(prog);
      setBestStreak(topStreak);

      const { data: lv } = await supabase.rpc("compute_child_level", { _child_id: childId });
      if (lv && typeof lv === "object") {
        const o = lv as any;
        const total = o.total_xp ?? 0;
        const inLevel = o.xp_in_level ?? 0;
        const toNext = o.xp_to_next ?? 100;
        const currentLevelMin = o.current_level_min_xp ?? Math.max(total - inLevel, 0);
        const nextTotal = o.next_level_total_xp ?? currentLevelMin + toNext;
        setLevel(o.level ?? 0);
        setTitle(o.title ?? "Escudeiro");
        setXpInLevel(inLevel);
        setXpToNext(toNext);
        setTotalXp(total);
        setNextLevelTotalXp(nextTotal);
        if (typeof o.best_streak === "number" && o.best_streak > topStreak) {
          setBestStreak(o.best_streak);
        }
      }
    };
    load();
  }, [childId, profile?.family_id]);

  const wonMissions = missions.filter(m => awards.some(a => a.mission_id === m.id));
  const inProgress = missions.filter(m => !awards.some(a => a.mission_id === m.id));
  const cosmeticsMap = useFamilyCosmetics(childId ? [childId] : [], cosmeticsKey);
  const equipment = (childId && cosmeticsMap[childId]?.equipment) || { avatar: null };

  return (
    <div className="space-y-6">
      <CharacterSheet
        name={child?.name ?? "..."}
        title={title}
        level={level}
        xpInLevel={xpInLevel}
        xpToNext={xpToNext}
        totalXp={totalXp}
        nextLevelTotalXp={nextLevelTotalXp}
        auris={Math.max(approvedAuris - paidAuris, 0)}
        medals={wonMissions.length}
        streak={bestStreak}
        pending={pendingAuris}
        approved={approvedAuris}
        paid={paidAuris}
        equipment={equipment}
        onBack={() => nav("/app/criancas")}
        onClose={() => nav("/app")}
        onAvatarClick={() => { setWardrobeTab("avatar"); setWardrobeOpen(true); }}
        onSlotClick={(slot: RealSlotKey) => { setWardrobeTab(slot); setWardrobeOpen(true); }}
        onLockedSlotClick={(label) => toast.info(`${label}: em breve! ✨`)}
        onActivities={() => activitiesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onCalendar={() => calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onRanking={() => rankingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />

      <ParentWardrobeDialog
        open={wardrobeOpen}
        onOpenChange={setWardrobeOpen}
        childId={childId ?? null}
        childName={child?.name}
        onChanged={() => setCosmeticsKey(k => k + 1)}
        defaultTab={wardrobeTab}
      />

      <div ref={activitiesRef} className="scroll-mt-4 space-y-6">
        <Card className="border-0 shadow-card rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="w-5 h-5 text-accent" /> Medalhas conquistadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wonMissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não conquistou medalhas. Bora começar!</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {wonMissions.map(m => {
                  const a = awards.find(x => x.mission_id === m.id)!;
                  return (
                    <div key={m.id} className="text-center space-y-2 p-3 rounded-2xl bg-gradient-warm/10 border">
                      {m.medal_url ? (
                        <img src={m.medal_url} alt={m.name} className="w-24 h-24 mx-auto rounded-full object-cover shadow-reward" />
                      ) : (
                        <div className="w-24 h-24 mx-auto rounded-full bg-accent flex items-center justify-center shadow-reward">
                          <Award className="w-12 h-12 text-accent-foreground" />
                        </div>
                      )}
                      <div className="font-display font-bold text-sm leading-tight">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(a.awarded_at).toLocaleDateString("pt-BR")}
                      </div>
                      {a.bonus_auris > 0 && (
                        <Badge className="bg-accent text-accent-foreground">+<AuriIcon size={11} className="inline mx-0.5" />{formatAuris(a.bonus_auris)}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <SideQuestHistory items={sideQuestHistory} showEmptyState showStatus />

        <Card className="border-0 shadow-card rounded-2xl bg-primary/5">
          <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-semibold flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> Visualizar como a criança</div>
              <p className="text-sm text-muted-foreground">Veja exatamente o painel que {child?.name ?? "ela"} enxerga ao entrar no app.</p>
            </div>
            <Button variant="hero" size="sm" onClick={async () => {
              if (!childId) return;
              const { data, error } = await supabase.functions.invoke("child-preview-session", { body: { child_id: childId } });
              if (error || !data?.token) { toast.error(error?.message ?? "Erro ao abrir prévia"); return; }
              window.open(`/c#t=${encodeURIComponent(data.token)}`, "_blank", "noopener");
            }}>
              <Eye className="w-4 h-4" /> Abrir painel da criança
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" /> Missões em andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem missões em andamento.</p>
            ) : inProgress.map(m => {
              const cur = progress[m.id] ?? 0;
              const pct = Math.min(100, Math.round((cur / m.goal_target) * 100));
              return (
                <div key={m.id} className="p-3 rounded-xl border bg-card">
                  <div className="flex items-center gap-3 mb-2">
                    {m.medal_url ? (
                      <img src={m.medal_url} alt="" className="w-12 h-12 rounded-full object-cover opacity-50" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Award className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {m.goal_type === "total" ? <Target className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                        {cur} de {m.goal_target} {m.goal_type === "streak" ? "dias seguidos" : ""}
                      </div>
                    </div>
                    {m.bonus_auris > 0 && (
                      <Badge variant="outline">+<AuriIcon size={11} className="inline mx-0.5" />{formatAuris(m.bonus_auris)}</Badge>
                    )}
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card ref={calendarRef} className="border-0 shadow-card rounded-2xl scroll-mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="w-5 h-5 text-primary" /> Calendário de Aventuras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Em breve — uma linha do tempo das aventuras desta criança.</p>
        </CardContent>
      </Card>

      <Card ref={rankingRef} className="border-0 shadow-card rounded-2xl scroll-mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-accent" /> Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Veja o ranking completo da família.</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/app">Ir para o ranking</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChildProfile;
