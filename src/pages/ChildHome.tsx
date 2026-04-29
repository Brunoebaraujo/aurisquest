import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Camera, Sparkles, CheckCircle2, Clock, XCircle, LogOut, Award } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateTime } from "@/lib/format";

type ChildSession = { id: string; name: string; family_id: string };
type Activity = { id: string; name: string; description: string | null; reward_amount_cents: number; category: string | null };
type Submission = { id: string; activity_id: string; status: string; reward_amount_cents: number; completed_at: string };
type Award = { id: string; mission_name: string; medal_url: string | null; awarded_at: string };

const ChildHome = () => {
  const nav = useNavigate();
  const [child, setChild] = useState<ChildSession | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [balance, setBalance] = useState(0);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("jk_child_token");
    localStorage.removeItem("jk_child");
    nav("/entrar", { replace: true });
  }, [nav]);

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

    // saldo: precisa de pagamentos — busca via rpc ou soma simples (pagamentos não vêm aqui).
    // Para saldo: ganhos aprovados - pagamentos. Vamos buscar pagamentos via tabela pública? Não temos mais.
    // Solução: incluir na função. Por ora mostramos só ganhos aprovados.
    const earned = (d.submissions ?? [])
      .filter((s: any) => s.status === "aprovado")
      .reduce((sum: number, s: any) => sum + (s.reward_amount_cents ?? 0), 0);
    setBalance(earned);
    setLoading(false);
  }, [logout]);

  useEffect(() => {
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
        body: { token, activity_id: selected.id, photo_url: pub.publicUrl },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "Erro");

      toast.success("Enviado! Aguardando aprovação 🎉");
      setSelected(null);
      setFile(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!child) return null;

  const statusIcon = (s: string) => s === "aprovado" ? <CheckCircle2 className="w-4 h-4 text-success" /> : s === "recusado" ? <XCircle className="w-4 h-4 text-destructive" /> : <Clock className="w-4 h-4 text-warning" />;
  const actName = (id: string) => activities.find(a => a.id === id)?.name ?? "Atividade";

  return (
    <div className="min-h-screen bg-gradient-hero pb-10">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-card/95 shadow-glow flex items-center justify-center">
              <Trophy className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold drop-shadow">Oi, {child.name}!</h1>
              <p className="text-xs flex items-center gap-1 opacity-90"><Sparkles className="w-3 h-3" /> Bora ganhar uma recompensa?</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-primary-foreground hover:bg-white/10">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <Card className="border-0 shadow-card rounded-3xl bg-gradient-reward text-accent-foreground">
          <CardContent className="p-5 text-center">
            <div className="text-sm opacity-80">Total ganho (aprovado)</div>
            <div className="text-4xl font-display font-bold">{formatBRL(balance)}</div>
          </CardContent>
        </Card>

        {!selected && (
          <Card className="border-0 shadow-card rounded-3xl">
            <CardContent className="p-5">
              <h2 className="font-display font-bold text-xl mb-4">Escolha uma atividade</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activities.map(a => (
                  <button key={a.id} onClick={() => setSelected(a)} className="text-left p-4 rounded-2xl border-2 border-border hover:border-primary hover:shadow-soft transition-bounce bg-card">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold">{a.name}</span>
                      <span className="font-display font-bold text-primary whitespace-nowrap">{formatBRL(a.reward_amount_cents)}</span>
                    </div>
                    {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
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
                  <Badge className="bg-gradient-reward text-accent-foreground border-0">{formatBRL(selected.reward_amount_cents)}</Badge>
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

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setSelected(null); setFile(null); }}>Cancelar</Button>
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
                    {formatBRL(h.reward_amount_cents)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChildHome;
