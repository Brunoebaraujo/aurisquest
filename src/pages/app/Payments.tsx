import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Plus, Trash2, ImageOff, Settings } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatBRL, formatDate, formatAuris } from "@/lib/format";
import { AuriIcon } from "@/components/AuriIcon";

type Child = { id: string; name: string };
type Payment = { id: string; child_id: string; amount_cents: number; auris_redeemed: number; note: string | null; paid_at: string; child: { name: string } | null };

const Payments = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [aurisPerReal, setAurisPerReal] = useState(1);
  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState("");
  const [auris, setAuris] = useState("");
  const [note, setNote] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateInput, setRateInput] = useState("1");

  const load = async () => {
    if (!profile?.family_id) return;
    const [kids, approved, pays, fam] = await Promise.all([
      supabase.from("children").select("id, name").eq("family_id", profile.family_id).order("name"),
      supabase.from("submissions").select("child_id, reward_auris").eq("family_id", profile.family_id).eq("status", "aprovado"),
      supabase.from("payments").select("*, child:children(name)").eq("family_id", profile.family_id).order("paid_at", { ascending: false }).limit(50),
      supabase.from("families").select("auris_per_real").eq("id", profile.family_id).maybeSingle(),
    ]);
    const bal: Record<string, number> = {};
    (kids.data ?? []).forEach(k => bal[k.id] = 0);
    (approved.data ?? []).forEach((r: any) => bal[r.child_id] = (bal[r.child_id] ?? 0) + (r.reward_auris ?? 0));
    (pays.data ?? []).forEach((p: any) => bal[p.child_id] = (bal[p.child_id] ?? 0) - (p.auris_redeemed ?? 0));
    setChildren((kids.data ?? []) as Child[]);
    setBalances(bal);
    setPayments((pays.data ?? []) as any);
    const r = (fam.data as any)?.auris_per_real ?? 1;
    setAurisPerReal(r); setRateInput(String(r));
  };
  useEffect(() => { load(); }, [profile?.family_id]);

  const aurisNum = parseInt(auris || "0", 10) || 0;
  const previewCents = Math.round((aurisNum / Math.max(1, aurisPerReal)) * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.family_id || !user || !childId) { toast.error("Selecione uma criança"); return; }
    if (!aurisNum || aurisNum <= 0) { toast.error("Auris inválidos"); return; }
    const { error } = await supabase.from("payments").insert({
      family_id: profile.family_id, child_id: childId,
      auris_redeemed: aurisNum, amount_cents: previewCents,
      note: note.trim() || null, created_by: user.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Pagamento registrado!"); setOpen(false); setAuris(""); setNote(""); setChildId(""); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Apagar este pagamento?")) return;
    await supabase.from("payments").delete().eq("id", id);
    load();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold">Pagamentos</h2>
          <p className="text-muted-foreground text-sm">Saldos em Auris e histórico de resgates.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="hero"><Plus className="w-4 h-4" /> Registrar pagamento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label>Criança</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={childId} onChange={e => setChildId(e.target.value)} required>
                    <option value="">Selecionar...</option>
                    {children.map(c => <option key={c.id} value={c.id}>{c.name} — saldo {formatAuris(balances[c.id] ?? 0)} Auris</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">Auris a resgatar <AuriIcon size={14} /></Label>
                  <Input type="number" min={1} value={auris} onChange={e => setAuris(e.target.value)} placeholder="100" required />
                  {aurisNum > 0 && (
                    <p className="text-xs text-muted-foreground">≈ <strong>{formatBRL(previewCents)}</strong> (taxa {aurisPerReal} Auris = R$1)</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Observação (opcional)</Label>
                  <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: pago em dinheiro" maxLength={120} />
                </div>
                <Button type="submit" variant="hero" className="w-full">Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children.map(c => (
          <Card key={c.id} className="border-0 shadow-card rounded-2xl bg-gradient-warm text-secondary-foreground">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2 opacity-90"><Wallet className="w-5 h-5" /> {c.name}</div>
              <div className="text-3xl font-display font-bold inline-flex items-center gap-2">
                <AuriIcon size={26} />{formatAuris(balances[c.id] ?? 0)}
              </div>
              <div className="text-xs opacity-80">≈ {formatBRL(Math.round(((balances[c.id] ?? 0) / Math.max(1, aurisPerReal)) * 100))}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-card rounded-2xl">
        <CardContent className="p-4">
          <h3 className="font-display font-semibold text-lg mb-3">Histórico</h3>
          {payments.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>}
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40">
                <div>
                  <div className="font-medium">{p.child?.name}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(p.paid_at)} {p.note && `· ${p.note}`}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-destructive inline-flex items-center gap-1">
                    - <AuriIcon size={14} />{formatAuris(p.auris_redeemed ?? 0)} <span className="text-xs text-muted-foreground font-normal">({formatBRL(p.amount_cents)})</span>
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4" /></Button>
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

export default Payments;
