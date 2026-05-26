import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Trophy, Camera, Sparkles, CheckCircle2, Clock, XCircle, LogOut, Award,
  CalendarDays, ChevronLeft, ChevronRight, Medal, Crown, Shirt, Package,
} from "lucide-react";
import { toast } from "sonner";
import { formatAuris, formatDateTime } from "@/lib/format";
import { AuriIcon } from "@/components/AuriIcon";
import { ActivityIcon } from "@/components/ActivityIcon";
import { TierBadge } from "@/components/TierBadge";
import { type ActivityTier, tierFromAuris } from "@/lib/tiers";
import { EquippedAvatar } from "@/components/cosmetics/EquippedAvatar";
import { LevelBadge, type LevelInfo } from "@/components/cosmetics/LevelBadge";
import { WardrobeDialog } from "@/components/cosmetics/WardrobeDialog";
import { RewardRevealModal, type RevealReward } from "@/components/cosmetics/RewardRevealModal";
import { ChildInventoryDialog } from "@/components/cosmetics/ChildInventoryDialog";
import { LevelUpModal } from "@/components/cosmetics/LevelUpModal";
import { buildEquipment, type DashboardCosmetics } from "@/lib/cosmetics";
import { SubmissionSuccess } from "@/components/SubmissionSuccess";
import { ExitChildModeDialog } from "@/components/ExitChildModeDialog";
import { SideQuestScroll } from "@/components/sidequest/SideQuestScroll";
import { SideQuestHistory } from "@/components/sidequest/SideQuestHistory";
import { useActiveSideQuest } from "@/hooks/useActiveSideQuest";

type ChildSession = { id: string; name: string; family_id: string; avatar_url?: string | null };
type Activity = { id: string; name: string; description: string | null; reward_auris: number; category: string | null; tier?: ActivityTier; icon_key?: string | null; icon_url?: string | null; streak?: number };
type Submission = { id: string; activity_id: string; status: string; reward_auris: number; completed_at: string };
type FamilySubmission = Submission & { child_id: string };
type FamilyChild = { id: string; name: string; avatar_url: string | null };
type AwardItem = { id: string; mission_name: string; medal_url: string | null; awarded_at: string };
type RankItem = { child_id: string; name: string; avatar_url: string | null; approved_count: number; earned_auris: number; pending_count: number; medals_count: number };
type MissionParticipant = { child_id: string; name: string; avatar_url: string | null; progress: number; achieved: boolean };
type MissionItem = {
  id: string; name: string; description: string | null;
  goal_type: "total" | "streak"; goal_target: number;
  bonus_auris: number; activity_id: string; activity_name: string | null;
  medal_url: string | null; participants: MissionParticipant[];
};

const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const weekdays = ["D","S","T","Q","Q","S","S"];
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

const ChildHome = () => {
  const nav = useNavigate();
  const [child, setChild] = useState<ChildSession | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [familyChildren, setFamilyChildren] = useState<FamilyChild[]>([]);
  const [familySubs, setFamilySubs] = useState<FamilySubmission[]>([]);
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [pendingAuris, setPendingAuris] = useState(0);
  const [approvedAuris, setApprovedAuris] = useState(0);
  const [paidAuris, setPaidAuris] = useState(0);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cosmetics, setCosmetics] = useState<DashboardCosmetics | null>(null);
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [rankingLevels, setRankingLevels] = useState<Record<string, number>>({});
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [newRewards, setNewRewards] = useState<RevealReward[]>([]);
  const [levelUp, setLevelUp] = useState<{ level: number; title?: string } | null>(null);
  const [levelGlow, setLevelGlow] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [sqBusy, setSqBusy] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("jk_child_token") : null;
  const { active: activeSideQuest, history: sideQuestHistory, refresh: refreshSideQuest } = useActiveSideQuest(token);
  const sharedMode = typeof window !== "undefined" && localStorage.getItem("aq_shared_mode") === "1";

  // Calendar state
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [calChildFilter, setCalChildFilter] = useState<string>("all");
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem("jk_child_token");
    localStorage.removeItem("jk_child");
    localStorage.removeItem("aq_shared_mode");
    if (sharedMode) {
      nav("/app/quem-entra", { replace: true });
    } else {
      nav("/entrar", { replace: true });
    }
  }, [nav, sharedMode]);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("jk_child_token");
    if (!token) { logout(); return; }
    const { data, error } = await supabase.rpc("get_child_dashboard", { _token: token });
    if (error || !data) { logout(); return; }
    const d = data as any;
    setChild(d.child);
    setActivities(d.activities ?? []);
    setSubmissions(d.submissions ?? []);
    setAwards(d.awards ?? []);
    setFamilyChildren(d.family_children ?? []);
    setFamilySubs(d.family_submissions ?? []);
    setRanking(d.ranking ?? []);
    setMissions(d.missions ?? []);

    const totals = d.totals ?? { pending_auris: 0, approved_auris: 0 };
    setPendingAuris(totals.pending_auris ?? 0);
    setApprovedAuris(totals.approved_auris ?? 0);
    setPaidAuris(d.paid_auris ?? 0);

    setCosmetics({
      equipment: d.equipment ?? null,
      unlocked_avatars: d.unlocked_avatars ?? [],
      unlocked_items: d.unlocked_items ?? [],
      avatars_catalog: d.avatars_catalog ?? [],
      items_catalog: d.items_catalog ?? [],
    });
    const newLevelInfo = d.level_info ?? null;
    // Detect level up
    if (newLevelInfo && d.child?.id) {
      const key = `jk_level_${d.child.id}`;
      const prev = Number(localStorage.getItem(key) ?? "0");
      if (prev > 0 && newLevelInfo.level > prev) {
        setLevelUp({ level: newLevelInfo.level, title: newLevelInfo.title });
        setLevelGlow(true);
        setTimeout(() => setLevelGlow(false), 4000);
      }
      localStorage.setItem(key, String(newLevelInfo.level));
    }
    setLevelInfo(newLevelInfo);
    const lvls: Record<string, number> = {};
    (d.ranking ?? []).forEach((r: any) => { if (r.child_id && typeof r.level === "number") lvls[r.child_id] = r.level; });
    setRankingLevels(lvls);
    setLoading(false);

    // Buscar recompensas recém-desbloqueadas para mostrar animação
    try {
      const { data: nu } = await supabase.rpc("get_child_new_unlocks", { _token: token });
      const list = ((nu as any)?.rewards ?? []) as RevealReward[];
      if (list.length > 0) setNewRewards(list);
    } catch { /* silencioso */ }
  }, [logout]);

  useEffect(() => {
    // Suporte a token de pré-visualização via hash (#t=...) — usado pelo painel dos pais
    if (typeof window !== "undefined" && window.location.hash.startsWith("#t=")) {
      const previewToken = decodeURIComponent(window.location.hash.slice(3));
      if (previewToken) {
        localStorage.setItem("jk_child_token", previewToken);
        localStorage.setItem("jk_child_preview", "1");
        history.replaceState(null, "", window.location.pathname);
      }
    }
    const token = localStorage.getItem("jk_child_token");
    if (!token) { nav("/entrar", { replace: true }); return; }
    refresh();
  }, [nav, refresh]);

  const submit = async () => {
    if (!selected || !child) return;
    if (!file) { toast.error("Tire uma foto da prova!"); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${child.family_id}/${child.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("proofs").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("proofs").getPublicUrl(path);

      const token = localStorage.getItem("jk_child_token");
      const { data, error } = await supabase.functions.invoke("child-submit", {
        body: { token, activity_id: selected.id, photo_url: pub.publicUrl, comment: comment.trim() || null },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "Erro");

      toast.success("Enviado! Aguardando aprovação 🎉");
      setSelected(null);
      setFile(null);
      setComment("");
      setSuccessOpen(true);
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
    } finally {
      setBusy(false);
    }
  };

  const childName = (id: string) => familyChildren.find(c => c.id === id)?.name ?? "—";
  const actName = (id: string) => activities.find(a => a.id === id)?.name ?? "Atividade";

  // ===== Calendar derived =====
  const calendarCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startWeekday = first.getDay();
    const totalCells = Math.ceil((startWeekday + last.getDate()) / 7) * 7;

    const buckets = new Map<string, { approved: number; pending: number; refused: number }>();
    familySubs.forEach(s => {
      if (calChildFilter !== "all" && s.child_id !== calChildFilter) return;
      const d = new Date(s.completed_at);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const k = dayKey(d);
      const b = buckets.get(k) ?? { approved: 0, pending: 0, refused: 0 };
      if (s.status === "aprovado") b.approved++;
      else if (s.status === "pendente") b.pending++;
      else b.refused++;
      buckets.set(k, b);
    });

    const cells: { date: Date | null; key: string; bucket?: { approved: number; pending: number; refused: number } }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null, key: `e-${i}` });
    for (let day = 1; day <= last.getDate(); day++) {
      const date = new Date(year, month, day);
      const k = dayKey(date);
      cells.push({ date, key: k, bucket: buckets.get(k) });
    }
    while (cells.length < totalCells) cells.push({ date: null, key: `e2-${cells.length}` });
    return cells;
  }, [familySubs, cursor, calChildFilter]);

  const todayKey = dayKey(new Date());
  const dayDetails = useMemo(() => {
    if (!openDayKey) return [];
    return familySubs
      .filter(s => dayKey(new Date(s.completed_at)) === openDayKey)
      .filter(s => calChildFilter === "all" || s.child_id === calChildFilter)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  }, [openDayKey, familySubs, calChildFilter]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!child) return null;

  const statusIcon = (s: string) => s === "aprovado" ? <CheckCircle2 className="w-4 h-4 text-success" /> : s === "recusado" ? <XCircle className="w-4 h-4 text-destructive" /> : <Clock className="w-4 h-4 text-warning" />;

  const goPrev = () => { const d = new Date(cursor); d.setMonth(d.getMonth()-1); setCursor(d); };
  const goNext = () => { const d = new Date(cursor); d.setMonth(d.getMonth()+1); setCursor(d); };

  const rankMedal = (i: number) =>
    i === 0 ? <Crown className="w-5 h-5 text-accent" /> :
    i === 1 ? <Medal className="w-5 h-5 text-muted-foreground" /> :
    i === 2 ? <Medal className="w-5 h-5 text-secondary-foreground" /> :
    <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i+1}</span>;

  return (
    <div className="min-h-screen kid-theme kid-bg pb-10">
      {sharedMode && (
        <div className="bg-primary text-primary-foreground text-center text-xs font-bold py-1.5 px-3 flex items-center justify-center gap-2 sticky top-0 z-30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>MODO CRIANÇA</span>
          <span className="opacity-70">·</span>
          <button
            onClick={() => setExitOpen(true)}
            className="underline underline-offset-2 hover:opacity-80"
          >
            Sair do modo criança
          </button>
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between text-primary-foreground gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-2xl bg-card/95 shadow-glow p-1">
              {cosmetics ? (
                <EquippedAvatar equipment={buildEquipment(cosmetics)} size={56} fallbackName={child.name} />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-warm flex items-center justify-center font-display font-bold text-secondary-foreground">
                  {child.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-display font-bold drop-shadow truncate">Oi, {child.name}!</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {levelInfo && <LevelBadge info={levelInfo} compact />}
                <p className="text-xs flex items-center gap-1 opacity-90"><Sparkles className="w-3 h-3" /> Bora brilhar!</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setInventoryOpen(true)} className="text-primary-foreground hover:bg-white/10" title="Inventário">
              <Package className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setWardrobeOpen(true)} className="text-primary-foreground hover:bg-white/10" title="Guarda-roupa">
              <Shirt className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="text-primary-foreground hover:bg-white/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {levelInfo && (
          <Card className="border-0 shadow-card rounded-2xl">
            <CardContent className="p-4">
              <LevelBadge info={levelInfo} />
              <div className="mt-2 text-[11px] text-muted-foreground flex flex-wrap gap-3">
                <span><AuriIcon size={10} className="inline mr-0.5" />{levelInfo.auris ?? 0} Auris</span>
                <span>🏅 {levelInfo.medals ?? 0} medalhas</span>
                <span>🔥 {levelInfo.best_streak ?? 0} dias seguidos</span>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSideQuest && (
          <SideQuestScroll
            quest={activeSideQuest}
            busy={sqBusy}
            onRequestComplete={() => setSqDialogOpen(true)}
          />
        )}

        {activeSideQuest && (
          <CompleteSideQuestDialog
            quest={activeSideQuest}
            open={sqDialogOpen}
            onOpenChange={setSqDialogOpen}
            busy={sqBusy}
            onConfirm={async ({ comment, file }) => {
              if (!token || !child) return;
              setSqBusy(true);
              try {
                let photoUrl: string | null = null;
                if (file) {
                  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
                  const path = `sidequests/${child.family_id}/${child.id}/${Date.now()}.${ext}`;
                  const up = await supabase.storage.from("proofs").upload(path, file, { upsert: false });
                  if (up.error) throw up.error;
                  photoUrl = supabase.storage.from("proofs").getPublicUrl(path).data.publicUrl;
                }
                const { data, error } = await supabase.rpc("complete_side_quest", {
                  _token: token,
                  _side_quest_id: activeSideQuest.id,
                  _child_comment: comment,
                  _child_photo_url: photoUrl,
                });
                if (error) { toast.error(error.message); return; }
                toast.success(`Pergaminho registrado! +${(data as any)?.reward_auris ?? activeSideQuest.reward_auris} Auris ✨`);
                setSqDialogOpen(false);
                await Promise.all([refreshSideQuest(), refresh()]);
              } catch (e: any) {
                toast.error(e.message ?? "Erro ao concluir");
              } finally { setSqBusy(false); }
            }}
          />
        )}

        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-card rounded-2xl bg-card">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-warning mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Total Pendente</span>
              </div>
              <div className="text-lg sm:text-xl font-display font-bold text-foreground leading-tight"><span className="inline-flex items-center justify-center gap-1"><AuriIcon size={14} />{formatAuris(pendingAuris)}</span></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card rounded-2xl bg-gradient-reward text-accent-foreground">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1 opacity-90">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Total Aprovado</span>
              </div>
              <div className="text-lg sm:text-xl font-display font-bold leading-tight"><span className="inline-flex items-center justify-center gap-1"><AuriIcon size={14} />{formatAuris(approvedAuris)}</span></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card rounded-2xl bg-card">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-success mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Total Pago</span>
              </div>
              <div className="text-lg sm:text-xl font-display font-bold text-foreground leading-tight"><span className="inline-flex items-center justify-center gap-1"><AuriIcon size={14} />{formatAuris(paidAuris)}</span></div>
            </CardContent>
          </Card>
        </div>

        {missions.length > 0 && (
          <Card className="border-0 shadow-card rounded-3xl">
            <CardContent className="p-5">
              <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-accent" /> Missões ativas
              </h2>
              <div className="space-y-4">
                {missions.map(m => (
                  <div key={m.id} className="rounded-2xl border-2 border-border p-4 bg-card">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <div className="font-display font-bold">{m.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.activity_name} · {m.goal_type === "streak" ? `${m.goal_target} dias seguidos` : `${m.goal_target} vezes`}
                        </div>
                      </div>
                      {m.bonus_auris > 0 && (
                        <Badge className="bg-gradient-reward text-accent-foreground border-0 whitespace-nowrap">
                          +<AuriIcon size={11} className="inline mx-0.5" />{formatAuris(m.bonus_auris)}
                        </Badge>
                      )}
                    </div>
                    {m.description && <p className="text-xs text-muted-foreground mb-2">{m.description}</p>}
                    <div className="space-y-2 mt-3">
                      {m.participants.map(p => {
                        const pct = Math.min(100, Math.round((p.progress / Math.max(m.goal_target, 1)) * 100));
                        const isMe = p.child_id === child.id;
                        return (
                          <div key={p.child_id} className={`p-2 rounded-xl ${isMe ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/40"}`}>
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                                  {p.name[0]?.toUpperCase()}
                                </div>
                                <span className={`truncate ${isMe ? "font-semibold" : ""}`}>{p.name}{isMe && " (você)"}</span>
                                {p.achieved && <Trophy className="w-4 h-4 text-accent shrink-0" />}
                              </div>
                              <span className="font-display font-bold whitespace-nowrap">
                                {p.progress}/{m.goal_target}
                              </span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full ${p.achieved ? "bg-success" : "bg-gradient-primary"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="atividades" className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-card/95 rounded-2xl p-1 h-auto">
            <TabsTrigger value="atividades" className="rounded-xl">Atividades</TabsTrigger>
            <TabsTrigger value="calendario" className="rounded-xl">Calendário</TabsTrigger>
            <TabsTrigger value="ranking" className="rounded-xl">Ranking</TabsTrigger>
          </TabsList>

          {/* ===== ATIVIDADES ===== */}
          <TabsContent value="atividades" className="space-y-6 mt-4">
            {!selected && (
              <Card className="border-0 shadow-card rounded-3xl">
                <CardContent className="p-5">
                  <h2 className="font-display font-bold text-xl mb-4">Escolha uma atividade</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activities.map(a => (
                      <button key={a.id} onClick={() => setSelected(a)} className="text-left p-4 rounded-2xl border-4 border-border hover:border-primary kid-sticker transition-bounce bg-card animate-pop-in">
                        <div className="flex items-start gap-3 mb-2">
                          <ActivityIcon iconKey={a.icon_key} iconUrl={a.icon_url} size={56} />
                          <div className="flex-1 min-w-0">
                            <div className="font-display font-bold text-base leading-tight mb-1">{a.name}</div>
                            <TierBadge tier={(a.tier ?? tierFromAuris(a.reward_auris)) as ActivityTier} size="sm" />
                          </div>
                        </div>
                        {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                        {(a.streak ?? 0) > 0 && (
                          <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-100 rounded-full px-2 py-0.5">
                            🔥 {a.streak} dia{(a.streak ?? 0) > 1 ? "s" : ""} seguidos
                          </div>
                        )}
                      </button>
                    ))}
                    {activities.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Nenhuma atividade disponível.</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {selected && (
              <Card className="border-0 shadow-card rounded-3xl">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Atividade escolhida</div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-bold text-xl">{selected.name}</h3>
                      <Badge className="bg-gradient-reward text-accent-foreground border-0"><span className="inline-flex items-center gap-1"><AuriIcon size={12} />{formatAuris(selected.reward_auris)}</span></Badge>
                    </div>
                  </div>

                  <label className="block">
                    <div className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-primary/40 rounded-2xl cursor-pointer hover:bg-primary/5 transition-smooth">
                      <Camera className="w-10 h-10 text-primary" />
                      <span className="text-sm font-medium">{file ? file.name : "Tirar / escolher foto da prova"}</span>
                      <span className="text-xs text-muted-foreground">A foto é obrigatória</span>
                    </div>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  </label>

                  {file && (
                    <img src={URL.createObjectURL(file)} alt="prévia" className="w-full max-h-64 object-cover rounded-2xl" />
                  )}

                  <div>
                    <label className="text-sm font-medium mb-1 block">Comentário (opcional)</label>
                    <Textarea
                      placeholder="Conta pra gente como foi! 😊"
                      value={comment}
                      onChange={e => setComment(e.target.value.slice(0, 500))}
                      rows={3}
                    />
                    <div className="text-[10px] text-muted-foreground text-right mt-1">{comment.length}/500</div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setSelected(null); setFile(null); setComment(""); }}>Cancelar</Button>
                    <Button variant="reward" className="flex-1" onClick={submit} disabled={busy || !file}>
                      {busy ? "Enviando..." : "Enviar para aprovação"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {awards.length > 0 && (
              <Card className="border-0 shadow-card rounded-3xl">
                <CardContent className="p-5">
                  <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2"><Award className="w-5 h-5 text-accent" /> Minhas medalhas</h2>
                  <div className="flex flex-wrap gap-3">
                    {awards.map(a => (
                      <div key={a.id} className="flex flex-col items-center w-20">
                        {a.medal_url ? (
                          <img src={a.medal_url} alt={a.mission_name} className="w-16 h-16 object-contain" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-warm flex items-center justify-center"><Award className="w-8 h-8 text-secondary-foreground" /></div>
                        )}
                        <div className="text-xs text-center mt-1 font-medium">{a.mission_name}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <SideQuestHistory items={sideQuestHistory} />



            <Card className="border-0 shadow-card rounded-3xl">
              <CardContent className="p-5">
                <h2 className="font-display font-bold text-lg mb-3">Meu histórico</h2>
                {submissions.length === 0 && <p className="text-sm text-muted-foreground">Você ainda não enviou nenhuma atividade.</p>}
                <div className="space-y-2">
                  {submissions.map(h => (
                    <div key={h.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/40">
                      <div className="flex items-center gap-2 min-w-0">
                        {statusIcon(h.status)}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{actName(h.activity_id)}</div>
                          <div className="text-xs text-muted-foreground">{formatDateTime(h.completed_at)}</div>
                        </div>
                      </div>
                      <span className={`font-display font-bold whitespace-nowrap ${h.status === "aprovado" ? "text-success" : h.status === "recusado" ? "text-muted-foreground line-through" : "text-warning"}`}>
                        <span className="inline-flex items-center gap-1"><AuriIcon size={11} />{formatAuris(h.reward_auris)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== CALENDÁRIO ===== */}
          <TabsContent value="calendario" className="mt-4 space-y-4">
            <Card className="border-0 shadow-card rounded-3xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <h2 className="font-display font-bold text-lg capitalize">
                      {monthNames[cursor.getMonth()]} {cursor.getFullYear()}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={goPrev}><ChevronLeft className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={goNext}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  <button
                    onClick={() => setCalChildFilter("all")}
                    className={`text-xs px-3 py-1 rounded-full border transition-smooth ${calChildFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}
                  >Todos</button>
                  {familyChildren.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCalChildFilter(c.id)}
                      className={`text-xs px-3 py-1 rounded-full border transition-smooth ${calChildFilter === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}
                    >{c.name}{c.id === child.id ? " (eu)" : ""}</button>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekdays.map((w, i) => (
                    <div key={i} className="text-[10px] font-semibold text-muted-foreground text-center py-1">{w}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map(cell => {
                    if (!cell.date) return <div key={cell.key} className="aspect-square rounded-lg bg-muted/30" />;
                    const b = cell.bucket;
                    const isToday = cell.key === todayKey;
                    return (
                      <button
                        key={cell.key}
                        onClick={() => setOpenDayKey(openDayKey === cell.key ? null : cell.key)}
                        className={`aspect-square rounded-lg p-1 flex flex-col justify-between border transition-smooth hover:scale-[1.03] text-left ${
                          b ? "bg-card border-border shadow-soft" : "bg-muted/40 border-border/50"
                        } ${isToday ? "ring-2 ring-primary" : ""} ${openDayKey === cell.key ? "ring-2 ring-accent" : ""}`}
                      >
                        <div className="text-[11px] font-semibold">{cell.date.getDate()}</div>
                        <div className="flex items-center justify-center gap-0.5 flex-wrap">
                          {b?.approved ? <span className="w-1.5 h-1.5 rounded-full bg-success" /> : null}
                          {b?.pending ? <span className="w-1.5 h-1.5 rounded-full bg-warning" /> : null}
                          {b?.refused ? <span className="w-1.5 h-1.5 rounded-full bg-destructive" /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Aprovado</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Pendente</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Recusado</span>
                </div>

                {openDayKey && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <h3 className="font-display font-bold text-sm">Atividades do dia</h3>
                    {dayDetails.length === 0 && <p className="text-xs text-muted-foreground">Nada por aqui.</p>}
                    {dayDetails.map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          {statusIcon(s.status)}
                          <div className="min-w-0">
                            <div className="font-medium truncate">{actName(s.activity_id)}</div>
                            <div className="text-[10px] text-muted-foreground">{childName(s.child_id)}</div>
                          </div>
                        </div>
                        <span className={`font-display font-bold text-xs whitespace-nowrap ${s.status === "aprovado" ? "text-success" : s.status === "recusado" ? "text-muted-foreground line-through" : "text-warning"}`}>
                          <span className="inline-flex items-center gap-1"><AuriIcon size={11} />{formatAuris(s.reward_auris)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== RANKING ===== */}
          <TabsContent value="ranking" className="mt-4 space-y-4">
            <Card className="border-0 shadow-card rounded-3xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-accent" />
                  <h2 className="font-display font-bold text-lg">Ranking da família</h2>
                </div>
                {ranking.length === 0 && <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
                <div className="space-y-2">
                  {ranking.map((r, i) => {
                    const isMe = r.child_id === child.id;
                    return (
                      <div key={r.child_id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${isMe ? "border-primary bg-primary/5" : "border-transparent bg-muted/40"}`}>
                        <div className="w-7 flex justify-center">{rankMedal(i)}</div>
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt={r.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-warm flex items-center justify-center font-bold text-secondary-foreground">
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-bold truncate flex items-center gap-1.5">
                            <span className="truncate">{r.name}{isMe && <span className="text-xs text-primary ml-1">(eu)</span>}</span>
                            {rankingLevels[r.child_id] != null && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                                <Sparkles className="w-2.5 h-2.5" />Lv {rankingLevels[r.child_id]}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>✅ {r.approved_count} aprovadas</span>
                            {r.pending_count > 0 && <span>⏳ {r.pending_count}</span>}
                            {r.medals_count > 0 && <span className="flex items-center gap-0.5"><Award className="w-3 h-3" /> {r.medals_count}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display font-bold text-success"><span className="inline-flex items-center gap-1"><AuriIcon size={12} />{formatAuris(r.earned_auris)}</span></div>
                          <div className="text-[10px] text-muted-foreground">ganho</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {cosmetics && (
        <>
          <WardrobeDialog
            open={wardrobeOpen}
            onOpenChange={setWardrobeOpen}
            data={cosmetics}
            token={typeof window !== "undefined" ? localStorage.getItem("jk_child_token") : null}
            onChanged={refresh}
          />
          <ChildInventoryDialog
            open={inventoryOpen}
            onOpenChange={setInventoryOpen}
            data={cosmetics}
          />
        </>
      )}

      <RewardRevealModal
        rewards={newRewards}
        onClose={async () => {
          setNewRewards([]);
          const token = localStorage.getItem("jk_child_token");
          if (token) {
            try { await supabase.rpc("mark_child_unlocks_seen", { _token: token }); } catch {}
          }
        }}
      />

      <LevelUpModal
        open={!!levelUp}
        onClose={() => setLevelUp(null)}
        childName={child?.name ?? ""}
        newLevel={levelUp?.level ?? 1}
        newTitle={levelUp?.title}
      />

      <SubmissionSuccess
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        sharedMode={sharedMode}
      />

      <ExitChildModeDialog open={exitOpen} onOpenChange={setExitOpen} />
    </div>
  );
};

export default ChildHome;
