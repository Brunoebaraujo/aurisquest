import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Camera, Sparkles, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type Child = { id: string; name: string; family_id: string };
type Activity = { id: string; name: string; description: string | null; reward_amount_cents: number; category: string | null };
type Submission = { id: string; status: string; reward_amount_cents: number; completed_at: string; activity: { name: string } | null };

const ChildSubmit = () => {
  const { childId } = useParams();
  const [child, setChild] = useState<Child | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [history, setHistory] = useState<Submission[]>([]);
  const [balance, setBalance] = useState(0);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!childId) return;
      const { data: c } = await supabase.from("children").select("id, name, family_id").eq("id", childId).maybeSingle();
      if (!c) { setLoading(false); return; }
      setChild(c as Child);

      const [acts, subs, pays] = await Promise.all([
        supabase.from("activities").select("*").eq("family_id", c.family_id).eq("active", true).order("name"),
        supabase.from("submissions").select("*, activity:activities(name)").eq("child_id", c.id).order("submitted_at", { ascending: false }).limit(20),
        supabase.from("payments").select("amount_cents").eq("child_id", c.id),
      ]);

      setActivities((acts.data ?? []) as Activity[]);
      const allSubs = (subs.data ?? []) as any;
      setHistory(allSubs);

      const earned = allSubs.filter((s: any) => s.status === "aprovado").reduce((sum: number, s: any) => sum + s.reward_amount_cents, 0);
      const paid = (pays.data ?? []).reduce((sum, p) => sum + p.amount_cents, 0);
      setBalance(earned - paid);
      setLoading(false);
    };
    load();
  }, [childId]);

  const submit = async () => {
    if (!selected || !child) return;
    if (!file) { toast.error("Tire ou anexe uma foto da prova!"); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${child.family_id}/${child.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("proofs").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("proofs").getPublicUrl(path);

      const { error } = await supabase.from("submissions").insert({
        family_id: child.family_id,
        child_id: child.id,
        activity_id: selected.id,
        photo_url: pub.publicUrl,
        status: "pendente",
        reward_amount_cents: selected.reward_amount_cents,
        completed_at: new Date().toISOString(),
      });
      if (error) throw error;

      toast.success("Enviado! Aguardando aprovação 🎉");
      setSelected(null);
      setFile(null);

      // recarrega histórico
      const { data: subs } = await supabase.from("submissions").select("*, activity:activities(name)").eq("child_id", child.id).order("submitted_at", { ascending: false }).limit(20);
      setHistory((subs ?? []) as any);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!child) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Link inválido. Peça outro ao seu responsável.</div>;

  const statusIcon = (s: string) => s === "aprovado" ? <CheckCircle2 className="w-4 h-4 text-success" /> : s === "recusado" ? <XCircle className="w-4 h-4 text-destructive" /> : <Clock className="w-4 h-4 text-warning" />;

  return (
    <div className="min-h-screen bg-gradient-hero pb-10">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">
        <div className="text-center text-primary-foreground">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card/95 shadow-glow mb-3">
            <Trophy className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold drop-shadow">Oi, {child.name}! 👋</h1>
          <p className="text-primary-foreground/90 text-sm flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4" /> Bora ganhar uma recompensa?
          </p>
        </div>

        <Card className="border-0 shadow-card rounded-3xl bg-gradient-reward text-accent-foreground">
          <CardContent className="p-5 text-center">
            <div className="text-sm opacity-80">Seu saldo</div>
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

        <Card className="border-0 shadow-card rounded-3xl">
          <CardContent className="p-5">
            <h2 className="font-display font-bold text-lg mb-3">Meu histórico</h2>
            {history.length === 0 && <p className="text-sm text-muted-foreground">Você ainda não enviou nenhuma atividade.</p>}
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    {statusIcon(h.status)}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{h.activity?.name}</div>
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

export default ChildSubmit;
