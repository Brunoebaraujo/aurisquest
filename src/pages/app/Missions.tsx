import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Trophy, Target, Flame, Award, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatAuris } from "@/lib/format";
import { AuriIcon } from "@/components/AuriIcon";
import { MissionTierSelector } from "@/components/MissionTierSelector";
import { MISSION_TIERS, missionAurisFor, missionTierFromAuris, type MissionTier } from "@/lib/tiers";

type Activity = { id: string; name: string; active: boolean };
type Child = { id: string; name: string };
type Mission = {
  id: string;
  name: string;
  description: string | null;
  activity_id: string;
  goal_type: "total" | "streak";
  goal_target: number;
  bonus_auris: number;
  medal_url: string | null;
  active: boolean;
  created_at: string;
};
type Award = { mission_id: string; child_id: string };
type Submission = {
  activity_id: string;
  child_id: string;
  completed_at: string;
  status: "pendente" | "aprovado" | "recusado";
};

type RankingRow = {
  childId: string;
  name: string;
  value: number;
  percent: number;
  completed: boolean;
};

const emptyForm = {
  name: "",
  description: "",
  activity_id: "",
  goal_type: "total" as "total" | "streak",
  goal_target: "5",
  bonus_tier: "bronze" as MissionTier,
  childIds: [] as string[],
  medalFile: null as File | null,
};

const toDateKey = (value: string) => value.slice(0, 10);

const longestStreak = (completedDates: string[]) => {
  const dates = Array.from(new Set(completedDates)).sort();
  let best = 0;
  let current = 0;
  let previous: number | null = null;

  dates.forEach(date => {
    const time = new Date(`${date}T00:00:00`).getTime();
    current = previous !== null && time - previous === 24 * 60 * 60 * 1000 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = time;
  });

  return best;
};

const Missions = () => {
  const { profile } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [participants, setParticipants] = useState<Record<string, string[]>>({});
  const [awards, setAwards] = useState<Award[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [open, setOpen] = useState(false);
  const [rankingMission, setRankingMission] = useState<Mission | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!profile?.family_id) return;
    const fid = profile.family_id;
    const [m, a, c, mp, ma, s] = await Promise.all([
      supabase.from("missions").select("*").eq("family_id", fid).order("created_at", { ascending: false }),
      supabase.from("activities").select("id, name, active").eq("family_id", fid).eq("active", true).order("name"),
      supabase.from("children").select("id, name").eq("family_id", fid).eq("active", true).order("name"),
      supabase.from("mission_participants").select("mission_id, child_id").eq("family_id", fid),
      supabase.from("mission_awards").select("mission_id, child_id").eq("family_id", fid),
      supabase.from("submissions").select("activity_id, child_id, completed_at, status").eq("family_id", fid).eq("status", "aprovado"),
    ]);
    setMissions((m.data ?? []) as Mission[]);
    setActivities((a.data ?? []) as Activity[]);
    setChildren((c.data ?? []) as Child[]);
    const map: Record<string, string[]> = {};
    (mp.data ?? []).forEach((r: any) => {
      map[r.mission_id] = [...(map[r.mission_id] ?? []), r.child_id];
    });
    setParticipants(map);
    setAwards((ma.data ?? []) as Award[]);
    setSubmissions((s.data ?? []) as Submission[]);
  };

  useEffect(() => { load(); }, [profile?.family_id]);

  const openNew = () => {
    setForm({ ...emptyForm, activity_id: activities[0]?.id ?? "" });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.family_id) return;
    if (!form.activity_id) { toast.error("Escolha uma atividade"); return; }
    if (form.childIds.length === 0) { toast.error("Selecione ao menos uma criança"); return; }
    const target = parseInt(form.goal_target, 10);
    if (isNaN(target) || target <= 0) { toast.error("Meta inválida"); return; }
    const bonus = missionAurisFor(form.bonus_tier);

    setBusy(true);
    try {
      let medalUrl: string | null = null;
      if (form.medalFile) {
        const ext = form.medalFile.name.split(".").pop();
        const path = `${profile.family_id}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("medals").upload(path, form.medalFile);
        if (up.error) throw up.error;
        medalUrl = supabase.storage.from("medals").getPublicUrl(path).data.publicUrl;
      }

      const { data: created, error } = await supabase.from("missions").insert({
        family_id: profile.family_id,
        activity_id: form.activity_id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        goal_type: form.goal_type,
        goal_target: target,
        bonus_auris: bonus,
        bonus_amount_cents: 0,
        medal_url: medalUrl,
        active: true,
      }).select().single();
      if (error) throw error;

      const rows = form.childIds.map(cid => ({
        mission_id: created!.id,
        child_id: cid,
        family_id: profile.family_id,
      }));
      const pErr = await supabase.from("mission_participants").insert(rows);
      if (pErr.error) throw pErr.error;

      toast.success("Missão criada!");
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar missão");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apagar esta missão? Conquistas concedidas serão removidas.")) return;
    const { error } = await supabase.from("missions").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Apagada"); load(); }
  };

  const toggleChild = (id: string) => {
    setForm(f => ({
      ...f,
      childIds: f.childIds.includes(id) ? f.childIds.filter(x => x !== id) : [...f.childIds, id],
    }));
  };

  const activityName = (id: string) => activities.find(a => a.id === id)?.name ?? "—";
  const childName = (id: string) => children.find(c => c.id === id)?.name ?? "—";
  const awardsFor = (mid: string) => awards.filter(a => a.mission_id === mid);

  const rankingFor = (mission: Mission): RankingRow[] => {
    const target = Math.max(mission.goal_target, 1);
    const missionStart = new Date(mission.created_at).getTime();
    const missionAwards = awardsFor(mission.id);

    return (participants[mission.id] ?? [])
      .map(childId => {
        const childSubmissions = submissions.filter(s =>
          s.activity_id === mission.activity_id &&
          s.child_id === childId &&
          new Date(s.completed_at).getTime() >= missionStart
        );
        const progress = mission.goal_type === "streak"
          ? longestStreak(childSubmissions.map(s => toDateKey(s.completed_at)))
          : childSubmissions.length;
        const completed = missionAwards.some(a => a.child_id === childId);
        const value = completed ? Math.max(progress, target) : progress;

        return {
          childId,
          name: childName(childId),
          value,
          percent: Math.min((value / target) * 100, 100),
          completed,
        };
      })
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "pt-BR"));
  };

  const selectedRanking = rankingMission ? rankingFor(rankingMission) : [];
  const hasRankingProgress = selectedRanking.some(row => row.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-accent" /> Missões e Medalhas
          </h2>
          <p className="text-muted-foreground text-sm">Crie desafios com bônus em Auris para as crianças.</p>
        </div>
        <Button variant="hero" onClick={openNew}><Plus className="w-4 h-4" /> Nova missão</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {missions.map(m => {
          const parts = participants[m.id] ?? [];
          const conquered = awardsFor(m.id);
          return (
            <Card
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => setRankingMission(m)}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setRankingMission(m);
                }
              }}
              className="border-0 shadow-card rounded-2xl overflow-hidden cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-reward focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CardContent className="p-0">
                <div className="bg-gradient-warm p-4 flex items-center gap-3 text-secondary-foreground">
                  {m.medal_url ? (
                    <img src={m.medal_url} alt="" className="w-16 h-16 rounded-full object-cover bg-card shadow-reward" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-card/30 flex items-center justify-center">
                      <Award className="w-8 h-8" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-lg leading-tight">{m.name}</div>
                    <div className="text-xs opacity-90 truncate">{activityName(m.activity_id)}</div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="gap-1">
                      {m.goal_type === "total"
                        ? <><Target className="w-3 h-3" /> {m.goal_target}× total</>
                        : <><Flame className="w-3 h-3" /> {m.goal_target} dias seguidos</>}
                    </Badge>
                    {m.bonus_auris > 0 && (
                      <Badge className="bg-accent text-accent-foreground gap-1">+ <AuriIcon size={12} /> {formatAuris(m.bonus_auris)}</Badge>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Participantes</div>
                    <div className="flex flex-wrap gap-1">
                      {parts.map(cid => {
                        const won = conquered.some(a => a.child_id === cid);
                        return (
                          <Badge key={cid} variant={won ? "default" : "secondary"} className={won ? "bg-success text-success-foreground" : ""}>
                            {won && "🏅 "}{childName(cid)}
                          </Badge>
                        );
                      })}
                      {parts.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(m.id);
                    }}
                    className="w-full justify-center"
                  >
                    <Trash2 className="w-4 h-4" /> Apagar missão
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {missions.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhuma missão ainda. Crie uma para motivar a turma!</p>
        )}
      </div>

      <Dialog open={!!rankingMission} onOpenChange={open => !open && setRankingMission(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ranking da missão</DialogTitle>
            {rankingMission && <p className="text-sm text-muted-foreground">{rankingMission.name}</p>}
          </DialogHeader>
          {rankingMission && (
            <div className="space-y-4">
              {selectedRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground">Esta missão ainda não tem participantes.</p>
              ) : (
                <div className="space-y-3">
                  {!hasRankingProgress && (
                    <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                      Ainda não há progresso registrado para esta missão.
                    </p>
                  )}
                  {selectedRanking.map((row, index) => (
                    <div key={row.childId} className="rounded-xl border bg-card p-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-accent">{index + 1}º lugar</div>
                          <div className="truncate font-medium">{row.name}</div>
                        </div>
                        <div className="shrink-0 text-sm font-semibold text-muted-foreground">
                          {rankingMission.goal_type === "streak"
                            ? `${row.value}/${rankingMission.goal_target} dias`
                            : `${row.value}/${rankingMission.goal_target}`}
                        </div>
                      </div>
                      <Progress value={row.percent} className="h-3" />
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => setRankingMission(null)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova missão</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label>Nome da missão</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength={80} placeholder="Ex: Mestre da Cama" />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} maxLength={300} />
            </div>
            <div className="space-y-2">
              <Label>Atividade vinculada</Label>
              <select required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.activity_id} onChange={e => setForm({ ...form, activity_id: e.target.value })}>
                <option value="">Selecione...</option>
                {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de meta</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.goal_type} onChange={e => setForm({ ...form, goal_type: e.target.value as "total" | "streak" })}>
                  <option value="total">Total de aprovações</option>
                  <option value="streak">Sequência de dias</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{form.goal_type === "total" ? "Quantidade" : "Dias seguidos"}</Label>
                <Input type="number" min={1} value={form.goal_target} onChange={e => setForm({ ...form, goal_target: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bônus da missão</Label>
              <MissionTierSelector value={form.bonus_tier} onChange={(t) => setForm({ ...form, bonus_tier: t })} />
              <p className="text-[11px] text-muted-foreground">Bônus padronizado: Bronze 5 · Prata 10 · Ouro 20 Auris.</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Upload className="w-4 h-4" /> Imagem da medalha</Label>
              <Input type="file" accept="image/*" onChange={e => setForm({ ...form, medalFile: e.target.files?.[0] ?? null })} />
              <p className="text-xs text-muted-foreground">Será mostrada no perfil da criança ao conquistar.</p>
            </div>
            <div className="space-y-2">
              <Label>Crianças participantes</Label>
              <div className="space-y-2 rounded-xl border p-3">
                {children.length === 0 && <p className="text-sm text-muted-foreground">Cadastre crianças primeiro.</p>}
                {children.map(c => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.childIds.includes(c.id)} onCheckedChange={() => toggleChild(c.id)} />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy ? "Salvando..." : "Criar missão"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Missions;
