import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Crown, Mail, Plus, Trash2, Trophy, Award, Copy, RefreshCw, Target, Flame, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatAuris } from "@/lib/format";
import { AuriIcon } from "@/components/AuriIcon";
import { Progress } from "@/components/ui/progress";
import { z } from "zod";

type Group = { id: string; name: string; type: string; description: string | null; owner_user_id: string };
type Member = { id: string; family_id: string; joined_at: string; familyName?: string };
type Invitation = { id: string; email: string; status: string; token: string; created_at: string; expires_at: string };
type SharedMission = {
  id: string; group_id: string; name: string; description: string | null;
  activity_name: string; mode: "coletiva" | "individual";
  goal_type: "total" | "streak"; goal_target: number;
  bonus_auris: number; medal_url: string | null; active: boolean;
};
type LogRow = { id: string; mission_id: string; child_id: string; family_id: string; logged_at: string };
type Child = { id: string; name: string; family_id: string; familyName?: string };
type AwardRow = { mission_id: string; child_id: string | null; bonus_auris: number };

const emailSchema = z.string().trim().email().max(255);

const GroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, profile } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [missions, setMissions] = useState<SharedMission[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [missionOpen, setMissionOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [missionForm, setMissionForm] = useState({
    name: "", description: "", activity_name: "",
    mode: "individual" as "individual" | "coletiva",
    goal_type: "total" as "total" | "streak",
    goal_target: "5", bonus_auris: "20",
  });

  const isOwner = group?.owner_user_id === user?.id;

  const load = useCallback(async () => {
    if (!groupId) return;
    const { data: g } = await supabase.from("shared_groups").select("*").eq("id", groupId).maybeSingle();
    if (!g) return;
    setGroup(g as Group);

    const [mem, inv, mis, lg, aw] = await Promise.all([
      supabase.from("shared_group_members").select("*").eq("group_id", groupId).order("joined_at"),
      supabase.from("shared_group_invitations").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
      supabase.from("shared_missions").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
      supabase.from("shared_mission_logs").select("*").in("mission_id",
        ((await supabase.from("shared_missions").select("id").eq("group_id", groupId)).data ?? []).map((r: any) => r.id) || ["00000000-0000-0000-0000-000000000000"]
      ),
      supabase.from("shared_mission_awards").select("mission_id, child_id, bonus_auris").in("mission_id",
        ((await supabase.from("shared_missions").select("id").eq("group_id", groupId)).data ?? []).map((r: any) => r.id) || ["00000000-0000-0000-0000-000000000000"]
      ),
    ]);

    const memberFamilies = (mem.data ?? []).map((m: any) => m.family_id);
    const [fams, kids] = await Promise.all([
      supabase.from("families").select("id, name").in("id", memberFamilies.length ? memberFamilies : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("children").select("id, name, family_id").in("family_id", memberFamilies.length ? memberFamilies : ["00000000-0000-0000-0000-000000000000"]).eq("active", true),
    ]);
    const famMap = new Map((fams.data ?? []).map((f: any) => [f.id, f.name]));
    setMembers((mem.data ?? []).map((m: any) => ({ ...m, familyName: famMap.get(m.family_id) ?? "Família" })));
    setChildren((kids.data ?? []).map((k: any) => ({ ...k, familyName: famMap.get(k.family_id) ?? "" })));
    setInvitations((inv.data ?? []) as Invitation[]);
    setMissions((mis.data ?? []) as SharedMission[]);
    setLogs((lg.data ?? []) as LogRow[]);
    setAwards((aw.data ?? []) as AwardRow[]);
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const sendInvite = async () => {
    if (!groupId || !user) return;
    const parsed = emailSchema.safeParse(inviteEmail);
    if (!parsed.success) { toast.error("Email inválido"); return; }
    setBusy(true);
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("shared_group_invitations").insert({
      group_id: groupId, email: parsed.data, token, created_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setInviteEmail("");
    setInviteOpen(false);
    toast.success("Convite criado! Compartilhe o link.");
    load();
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/grupo-convite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const cancelInvite = async (id: string) => {
    await supabase.from("shared_group_invitations").update({ status: "cancelado" }).eq("id", id);
    load();
  };

  const createMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !user) return;
    const target = parseInt(missionForm.goal_target, 10);
    if (!missionForm.name.trim() || !missionForm.activity_name.trim() || isNaN(target) || target <= 0) {
      toast.error("Preencha os campos corretamente"); return;
    }
    setBusy(true);
    const { error } = await supabase.from("shared_missions").insert({
      group_id: groupId,
      name: missionForm.name.trim(),
      description: missionForm.description.trim() || null,
      activity_name: missionForm.activity_name.trim(),
      mode: missionForm.mode,
      goal_type: missionForm.goal_type,
      goal_target: target,
      bonus_auris: Math.max(0, parseInt(missionForm.bonus_auris, 10) || 0),
      created_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setMissionOpen(false);
    setMissionForm({ name: "", description: "", activity_name: "", mode: "individual", goal_type: "total", goal_target: "5", bonus_auris: "20" });
    toast.success("Missão criada!");
    load();
  };

  const deleteMission = async (id: string) => {
    if (!confirm("Apagar esta missão?")) return;
    await supabase.from("shared_missions").delete().eq("id", id);
    load();
  };

  const logForChild = async (mission: SharedMission, childId: string) => {
    if (!user || !profile?.family_id) return;
    const { error } = await supabase.from("shared_mission_logs").insert({
      mission_id: mission.id, child_id: childId, family_id: profile.family_id, approved_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Registrado!");
    load();
  };

  const myChildren = children.filter(c => c.family_id === profile?.family_id);

  const progressFor = (m: SharedMission, childId?: string) => {
    if (m.mode === "coletiva") return logs.filter(l => l.mission_id === m.id).length;
    return logs.filter(l => l.mission_id === m.id && l.child_id === childId).length;
  };
  const isAchieved = (m: SharedMission, childId?: string) => {
    if (m.mode === "coletiva") return awards.some(a => a.mission_id === m.id && a.child_id === null);
    return awards.some(a => a.mission_id === m.id && a.child_id === childId);
  };

  if (!group) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/app/grupos"><ArrowLeft className="w-4 h-4" /> Voltar</Link>
      </Button>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-3xl font-display font-bold flex items-center gap-2">
            {group.name}
            {isOwner && <Crown className="w-6 h-6 text-accent" />}
          </h2>
          {group.description && <p className="text-muted-foreground mt-1">{group.description}</p>}
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(true)}><Mail className="w-4 h-4" /> Convidar responsável</Button>
            <Button variant="hero" onClick={() => setMissionOpen(true)}><Plus className="w-4 h-4" /> Nova missão</Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="missoes">
        <TabsList>
          <TabsTrigger value="missoes">Missões</TabsTrigger>
          <TabsTrigger value="membros">Membros</TabsTrigger>
          {isOwner && <TabsTrigger value="convites">Convites</TabsTrigger>}
        </TabsList>

        <TabsContent value="missoes" className="space-y-4 mt-4">
          {missions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma missão ainda.</p>}
          {missions.map(m => {
            const collProgress = progressFor(m);
            const collDone = m.mode === "coletiva" && isAchieved(m);
            return (
              <Card key={m.id} className="border-0 shadow-card rounded-2xl">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display font-bold text-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-accent" /> {m.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.activity_name} · {m.mode === "coletiva" ? "Coletiva" : "Individual"} ·{" "}
                        {m.goal_type === "streak" ? `${m.goal_target} dias seguidos` : `${m.goal_target}×`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.bonus_auris > 0 && (
                        <Badge className="bg-accent text-accent-foreground gap-1">
                          + <AuriIcon size={12} /> {formatAuris(m.bonus_auris)}
                        </Badge>
                      )}
                      {isOwner && (
                        <Button variant="ghost" size="icon" onClick={() => deleteMission(m.id)}><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </div>
                  {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}

                  {m.mode === "coletiva" ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progresso coletivo</span>
                        <span className="font-bold">{collProgress}/{m.goal_target}</span>
                      </div>
                      <Progress value={Math.min(100, (collProgress / m.goal_target) * 100)} />
                      {collDone && <Badge className="bg-success text-success-foreground"><CheckCircle2 className="w-3 h-3 mr-1" /> Conquistada!</Badge>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {children.map(c => {
                        const p = progressFor(m, c.id);
                        const done = isAchieved(m, c.id);
                        const mine = c.family_id === profile?.family_id;
                        return (
                          <div key={c.id} className={`p-2 rounded-lg ${mine ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/40"}`}>
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium truncate">{c.name}</span>
                                <span className="text-xs text-muted-foreground truncate">({c.familyName})</span>
                                {done && <Trophy className="w-4 h-4 text-accent shrink-0" />}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs whitespace-nowrap">{p}/{m.goal_target}</span>
                                {mine && !done && (
                                  <Button size="sm" variant="outline" onClick={() => logForChild(m, c.id)}>
                                    <Plus className="w-3 h-3" /> Registrar
                                  </Button>
                                )}
                              </div>
                            </div>
                            <Progress value={Math.min(100, (p / m.goal_target) * 100)} className="h-1 mt-1" />
                          </div>
                        );
                      })}
                      {children.length === 0 && <p className="text-xs text-muted-foreground">Aguardando crianças nos membros do grupo.</p>}
                    </div>
                  )}

                  {m.mode === "coletiva" && myChildren.length > 0 && !collDone && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground self-center">Registrar para:</span>
                      {myChildren.map(c => (
                        <Button key={c.id} size="sm" variant="outline" onClick={() => logForChild(m, c.id)}>
                          <Plus className="w-3 h-3" /> {c.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="membros" className="mt-4 space-y-3">
          {members.map(m => {
            const kids = children.filter(c => c.family_id === m.family_id);
            return (
              <Card key={m.id} className="border-0 shadow-card rounded-2xl">
                <CardContent className="p-4">
                  <div className="font-semibold">{m.familyName}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {kids.length} {kids.length === 1 ? "criança" : "crianças"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {kids.map(c => <Badge key={c.id} variant="secondary">{c.name}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {isOwner && (
          <TabsContent value="convites" className="mt-4 space-y-3">
            {invitations.length === 0 && <p className="text-sm text-muted-foreground">Nenhum convite enviado.</p>}
            {invitations.map(i => (
              <Card key={i.id} className="border-0 shadow-card rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium">{i.email}</div>
                    <div className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="mr-1">{i.status}</Badge>
                      Expira em {new Date(i.expires_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  {i.status === "pendente" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyInviteLink(i.token)}><Copy className="w-3 h-3" /> Copiar link</Button>
                      <Button size="sm" variant="ghost" onClick={() => cancelInvite(i.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>

      {/* Convite */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar responsável</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Email</Label>
            <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="responsavel@email.com" />
            <Button onClick={sendInvite} disabled={busy} variant="hero" className="w-full">
              {busy ? "Criando..." : "Criar convite"}
            </Button>
            <p className="text-xs text-muted-foreground">Após criar, copie o link na aba Convites e envie ao responsável.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nova missão */}
      <Dialog open={missionOpen} onOpenChange={setMissionOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova missão compartilhada</DialogTitle></DialogHeader>
          <form onSubmit={createMission} className="space-y-3">
            <div className="space-y-2"><Label>Nome</Label>
              <Input required maxLength={80} value={missionForm.name} onChange={e => setMissionForm({ ...missionForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Descrição (opcional)</Label>
              <Textarea rows={2} value={missionForm.description} onChange={e => setMissionForm({ ...missionForm, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Atividade (texto livre)</Label>
              <Input required maxLength={80} value={missionForm.activity_name} onChange={e => setMissionForm({ ...missionForm, activity_name: e.target.value })} placeholder="Ex: Ler 1 livro" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Modo</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={missionForm.mode} onChange={e => setMissionForm({ ...missionForm, mode: e.target.value as any })}>
                  <option value="individual">Individual</option>
                  <option value="coletiva">Coletiva</option>
                </select></div>
              <div className="space-y-2"><Label>Tipo de meta</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={missionForm.goal_type} onChange={e => setMissionForm({ ...missionForm, goal_type: e.target.value as any })}>
                  <option value="total">Total</option>
                  {missionForm.mode === "individual" && <option value="streak">Sequência</option>}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Meta</Label>
                <Input type="number" min={1} required value={missionForm.goal_target}
                  onChange={e => setMissionForm({ ...missionForm, goal_target: e.target.value })} /></div>
              <div className="space-y-2"><Label className="flex items-center gap-1">Bônus <AuriIcon size={12} /></Label>
                <Input type="number" min={0} value={missionForm.bonus_auris}
                  onChange={e => setMissionForm({ ...missionForm, bonus_auris: e.target.value })} /></div>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>{busy ? "Criando..." : "Criar missão"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupDetail;
