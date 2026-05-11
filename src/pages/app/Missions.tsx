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
};
type Award = { mission_id: string; child_id: string };

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

const Missions = () => {
  const { profile } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [participants, setParticipants] = useState<Record<string, string[]>>({});
  const [awards, setAwards] = useState<Award[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!profile?.family_id) return;
    const fid = profile.family_id;
    const [m, a, c, mp, ma] = await Promise.all([
      supabase.from("missions").select("*").eq("family_id", fid).order("created_at", { ascending: false }),
      supabase.from("activities").select("id, name, active").eq("family_id", fid).eq("active", true).order("name"),
      supabase.from("children").select("id, name").eq("family_id", fid).eq("active", true).order("name"),
      supabase.from("mission_participants").select("mission_id, child_id").eq("family_id", fid),
      supabase.from("mission_awards").select("mission_id, child_id").eq("family_id", fid),
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
    const bonus = Math.max(0, parseInt(form.bonus_auris, 10) || 0);

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
            <Card key={m.id} className="border-0 shadow-card rounded-2xl overflow-hidden">
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
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="w-full justify-center">
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
              <Label className="flex items-center gap-1">Bônus em <AuriIcon size={14} /> Auris</Label>
              <Input type="number" min={0} value={form.bonus_auris} onChange={e => setForm({ ...form, bonus_auris: e.target.value })} placeholder="10" />
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
