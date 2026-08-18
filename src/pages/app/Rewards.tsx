import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Wallet, ImageOff, Settings, CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, Trophy, ListPlus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatAuris, formatDateTime } from "@/lib/format";
import { AuriIcon } from "@/components/AuriIcon";
import { CATEGORY_LABELS } from "@/components/rewards/RewardFormDialog";

type Child = { id: string; name: string };
type Redemption = {
  id: string; child_id: string; reward_id: string | null;
  reward_name_snapshot: string; reward_category_snapshot: string;
  auris_cost: number; status: "pendente" | "aprovado" | "recusado" | "concluido";
  requested_at: string; reviewed_at: string | null; review_note: string | null;
  legacy_payment_id: string | null;
  child?: { name: string } | null;
};

const STATUS_LABEL: Record<Redemption["status"], string> = {
  pendente: "Aguardando aprovação",
  aprovado: "Aprovado",
  recusado: "Recusado",
  concluido: "Concluído",
};

const Rewards = () => {
  const { profile, refreshProfile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [earned, setEarned] = useState<Record<string, number>>({});
  const [legacyPaid, setLegacyPaid] = useState<Record<string, number>>({});
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [aurisPerReal, setAurisPerReal] = useState(1);
  const [cleaning, setCleaning] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateInput, setRateInput] = useState("1");

  const load = async () => {
    if (!profile?.family_id) return;
    const [kids, approved, pays, reds, fam] = await Promise.all([
      supabase.from("children").select("id, name").eq("family_id", profile.family_id).order("name"),
      supabase.from("submissions").select("child_id, reward_auris").eq("family_id", profile.family_id).eq("status", "aprovado"),
      supabase.from("payments").select("child_id, auris_redeemed").eq("family_id", profile.family_id),
      supabase.from("reward_redemptions").select("*, child:children(name)").eq("family_id", profile.family_id).order("requested_at", { ascending: false }).limit(200),
      supabase.from("families").select("auris_per_real").eq("id", profile.family_id).maybeSingle(),
    ]);
    const e: Record<string, number> = {};
    const lp: Record<string, number> = {};
    (kids.data ?? []).forEach(k => { e[k.id] = 0; lp[k.id] = 0; });
    (approved.data ?? []).forEach((r: any) => e[r.child_id] = (e[r.child_id] ?? 0) + (r.reward_auris ?? 0));
    (pays.data ?? []).forEach((p: any) => lp[p.child_id] = (lp[p.child_id] ?? 0) + (p.auris_redeemed ?? 0));
    setChildren((kids.data ?? []) as Child[]);
    setEarned(e);
    setLegacyPaid(lp);
    setRedemptions((reds.data ?? []) as any);
    const r = (fam.data as any)?.auris_per_real ?? 1;
    setAurisPerReal(r); setRateInput(String(r));
  };
  useEffect(() => { load(); }, [profile?.family_id]);

  // spent per child = legacy payments + non-legacy redemptions (aprovado/concluido)
  const spent = useMemo(() => {
    const s: Record<string, number> = {};
    children.forEach(c => s[c.id] = legacyPaid[c.id] ?? 0);
    redemptions.forEach(r => {
      if (!r.legacy_payment_id && (r.status === "aprovado" || r.status === "concluido")) {
        s[r.child_id] = (s[r.child_id] ?? 0) + r.auris_cost;
      }
    });
    return s;
  }, [children, legacyPaid, redemptions]);

  const pending = redemptions.filter(r => r.status === "pendente");

  const stats = useMemo(() => {
    const totalEarned = Object.values(earned).reduce((a, b) => a + b, 0);
    const totalSpent = Object.values(spent).reduce((a, b) => a + b, 0);
    const counts = new Map<string, number>();
    redemptions.forEach(r => {
      if (r.status === "aprovado" || r.status === "concluido") {
        counts.set(r.reward_name_snapshot, (counts.get(r.reward_name_snapshot) ?? 0) + 1);
      }
    });
    let top = "—"; let topN = 0;
    counts.forEach((v, k) => { if (v > topN) { top = k; topN = v; } });
    return { totalEarned, totalSpent, familyBalance: Math.max(totalEarned - totalSpent, 0), topReward: top, topCount: topN };
  }, [earned, spent, redemptions]);

  const updateStatus = async (r: Redemption, status: Redemption["status"], note?: string) => {
    const { error } = await supabase.from("reward_redemptions").update({
      status,
      reviewed_at: new Date().toISOString(),
      review_note: note ?? null,
    }).eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success(status === "aprovado" ? "Aprovado!" : status === "recusado" ? "Recusado" : "Atualizado"); load(); }
  };

  const removeRedemption = async (r: Redemption) => {
    if (r.legacy_payment_id) { toast.error("Histórico legado não pode ser apagado aqui."); return; }
    if (!confirm("Apagar este registro?")) return;
    const { error } = await supabase.from("reward_redemptions").delete().eq("id", r.id);
    if (error) toast.error(error.message); else load();
  };

  const cleanupPhotos = async () => {
    setCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-old-photos");
      if (error) throw error;
      const n = (data as any)?.deleted ?? 0;
      toast.success(n > 0 ? `${n} foto(s) antiga(s) removida(s)!` : "Nenhuma foto com mais de 6 meses encontrada.");
    } catch (e: any) { toast.error(e.message ?? "Erro ao limpar fotos"); }
    finally { setCleaning(false); }
  };

  const saveRate = async () => {
    const v = parseInt(rateInput, 10);
    if (!v || v < 1) { toast.error("Informe um valor válido"); return; }
    const { error } = await supabase.from("families").update({ auris_per_real: v }).eq("id", profile!.family_id!);
    if (error) toast.error(error.message);
    else { toast.success("Taxa atualizada"); setAurisPerReal(v); setRateOpen(false); refreshProfile(); }
  };

  const statusIcon = (s: Redemption["status"]) =>
    s === "aprovado" || s === "concluido" ? <CheckCircle2 className="w-4 h-4 text-success" /> :
    s === "recusado" ? <XCircle className="w-4 h-4 text-destructive" /> :
    <Clock className="w-4 h-4 text-warning" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold">Mercador</h2>
          <p className="text-muted-foreground text-sm">Crianças podem trocar Auris pelas recompensas que você criar.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="hero">
            <Link to="/app/recompensas/catalogo"><ListPlus className="w-4 h-4" /> Catálogo</Link>
          </Button>
          <Button variant="outline" onClick={() => setRateOpen(true)}>
            <Settings className="w-4 h-4" /> Taxa: {aurisPerReal} <AuriIcon size={14} /> = R$1
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={cleaning}><ImageOff className="w-4 h-4" /> {cleaning ? "Limpando..." : "Limpar fotos antigas"}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar fotos com mais de 6 meses?</AlertDialogTitle>
                <AlertDialogDescription>As fotos das atividades enviadas há mais de 6 meses serão apagadas permanentemente. Saldos não serão afetados.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={cleanupPhotos}>Limpar fotos</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-card rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Total ganho</div>
            <div className="text-2xl font-display font-bold inline-flex items-center gap-1"><AuriIcon size={20} />{formatAuris(stats.totalEarned)}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> Total resgatado</div>
            <div className="text-2xl font-display font-bold inline-flex items-center gap-1"><AuriIcon size={20} />{formatAuris(stats.totalSpent)}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Saldo da família</div>
            <div className="text-2xl font-display font-bold inline-flex items-center gap-1"><AuriIcon size={20} />{formatAuris(stats.familyBalance)}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Mais resgatada</div>
            <div className="text-sm font-display font-bold truncate">{stats.topReward}</div>
            {stats.topCount > 0 && <div className="text-[10px] text-muted-foreground">{stats.topCount}x</div>}
          </CardContent>
        </Card>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <Card className="border-0 shadow-card rounded-2xl border-l-4 border-l-warning">
          <CardContent className="p-4">
            <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" /> Aprovações pendentes
              <Badge variant="secondary">{pending.length}</Badge>
            </h3>
            <div className="space-y-2">
              {pending.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium">{r.child?.name} <span className="text-muted-foreground">→</span> {r.reward_name_snapshot}</div>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <AuriIcon size={11} />{formatAuris(r.auris_cost)} · {formatDateTime(r.requested_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="hero" onClick={() => updateStatus(r, "aprovado")}>Aprovar</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r, "recusado")}>Recusar</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-child cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children.map(c => {
          const balance = Math.max((earned[c.id] ?? 0) - (spent[c.id] ?? 0), 0);
          return (
            <Card key={c.id} className="border-0 shadow-card rounded-2xl bg-gradient-warm text-secondary-foreground">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2 opacity-90"><Wallet className="w-5 h-5" /> {c.name}</div>
                <div className="text-3xl font-display font-bold inline-flex items-center gap-2">
                  <AuriIcon size={26} />{formatAuris(balance)}
                </div>
                <div className="text-[11px] opacity-80 mt-2 space-y-0.5">
                  <div>Ganhos: {formatAuris(earned[c.id] ?? 0)}</div>
                  <div>Resgatados: {formatAuris(spent[c.id] ?? 0)}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* History */}
      <Card className="border-0 shadow-card rounded-2xl">
        <CardContent className="p-4">
          <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5" /> Histórico de Resgates
          </h3>
          {redemptions.length === 0 && <p className="text-sm text-muted-foreground">Nenhum resgate registrado.</p>}
          <div className="space-y-2">
            {redemptions.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  {statusIcon(r.status)}
                  <div className="min-w-0">
                    <div className="font-medium">{r.child?.name} · {r.reward_name_snapshot}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(r.requested_at)} · {CATEGORY_LABELS[r.reward_category_snapshot as keyof typeof CATEGORY_LABELS] ?? r.reward_category_snapshot} · {STATUS_LABEL[r.status]}
                      {r.legacy_payment_id && " · (legado)"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-destructive inline-flex items-center gap-1 whitespace-nowrap">
                    - <AuriIcon size={14} />{formatAuris(r.auris_cost)}
                  </span>
                  {!r.legacy_payment_id && (
                    <Button variant="ghost" size="sm" onClick={() => removeRedemption(r)} className="text-muted-foreground">
                      Apagar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={rateOpen} onOpenChange={setRateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Taxa de conversão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Quantos Auris valem R$1,00? (Padrão: 1)</p>
            <Input type="number" min={1} value={rateInput} onChange={e => setRateInput(e.target.value)} />
            <p className="text-xs text-muted-foreground">Ex: <strong>10</strong> significa que 10 Auris = R$1,00.</p>
            <Button onClick={saveRate} variant="hero" className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rewards;
