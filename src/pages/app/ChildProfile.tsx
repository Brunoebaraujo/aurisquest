import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Award, Trophy, Target, Flame, Sparkles, Eye } from "lucide-react";
import { formatAuris } from "@/lib/format";
import { AuriIcon } from "@/components/AuriIcon";
import { toast } from "sonner";
import { EquippedAvatar } from "@/components/cosmetics/EquippedAvatar";
import { useFamilyCosmetics } from "@/hooks/useFamilyCosmetics";

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

const ChildProfile = () => {
  const { childId } = useParams();
  const { profile } = useAuth();
  const [child, setChild] = useState<Child | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      if (!childId || !profile?.family_id) return;
      const fid = profile.family_id;

      const [c, mList, mp, ma] = await Promise.all([
        supabase.from("children").select("id, name, avatar_url").eq("id", childId).maybeSingle(),
        supabase.from("missions").select("*").eq("family_id", fid),
        supabase.from("mission_participants").select("mission_id").eq("child_id", childId).eq("family_id", fid),
        supabase.from("mission_awards").select("mission_id, awarded_at, bonus_auris").eq("child_id", childId).eq("family_id", fid),
      ]);
      setChild(c.data as Child);
      const myMissionIds = new Set((mp.data ?? []).map((r: any) => r.mission_id));
      const my = ((mList.data ?? []) as Mission[]).filter(m => myMissionIds.has(m.id));
      setMissions(my);
      setAwards((ma.data ?? []) as AwardRow[]);

      // compute progress per mission
      const prog: Record<string, number> = {};
      for (const m of my) {
        if (m.goal_type === "total") {
          const { count } = await supabase.from("submissions")
            .select("id", { count: "exact", head: true })
            .eq("child_id", childId).eq("activity_id", m.activity_id).eq("status", "aprovado");
          prog[m.id] = count ?? 0;
        } else {
          // streak
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
        }
      }
      setProgress(prog);
    };
    load();
  }, [childId, profile?.family_id]);

  const wonMissions = missions.filter(m => awards.some(a => a.mission_id === m.id));
  const inProgress = missions.filter(m => !awards.some(a => a.mission_id === m.id));
  const cosmeticsMap = useFamilyCosmetics(childId ? [childId] : []);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/app/criancas"><ArrowLeft className="w-4 h-4" /> Voltar</Link>
      </Button>

      <div className="flex items-center gap-4">
        <EquippedAvatar
          equipment={(childId && cosmeticsMap[childId]?.equipment) || { avatar: null }}
          size={96}
          fallbackName={child?.name}
        />
        <div>
          <h2 className="text-3xl font-display font-bold">{child?.name ?? "..."}</h2>
          <p className="text-muted-foreground">{wonMissions.length} {wonMissions.length === 1 ? "medalha conquistada" : "medalhas conquistadas"}</p>
        </div>
      </div>

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
  );
};

export default ChildProfile;
