import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Plus, Trash2, ImageOff } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatBRL, formatDate } from "@/lib/format";

type Child = { id: string; name: string };
type Payment = { id: string; child_id: string; amount_cents: number; note: string | null; paid_at: string; child: { name: string } | null };

const Payments = () => {
  const { profile, user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [cleaning, setCleaning] = useState(false);

  const load = async () => {
    if (!profile?.family_id) return;
    const [kids, approved, pays] = await Promise.all([
      supabase.from("children").select("id, name").eq("family_id", profile.family_id).order("name"),
      supabase.from("submissions").select("child_id, reward_amount_cents").eq("family_id", profile.family_id).eq("status", "aprovado"),
      supabase.from("payments").select("*, child:children(name)").eq("family_id", profile.family_id).order("paid_at", { ascending: false }).limit(50),
    ]);

    const bal: Record<string, number> = {};
    (kids.data ?? []).forEach(k => bal[k.id] = 0);
    (approved.data ?? []).forEach(r => bal[r.child_id] = (bal[r.child_id] ?? 0) + r.reward_amount_cents);
    (pays.data ?? []).forEach(p => bal[p.child_id] = (bal[p.child_id] ?? 0) - p.amount_cents);

    setChildren((kids.data ?? []) as Child[]);
    setBalances(bal);
    setPayments((pays.data ?? []) as any);
  };
  useEffect(() => { load(); }, [profile?.family_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.family_id || !user || !childId) { toast.error("Selecione uma criança"); return; }
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!cents || cents <= 0) { toast.error("Valor inválido"); return; }
    const { error } = await supabase.from("payments").insert({
      family_id: profile.family_id,
      child_id: childId,
      amount_cents: cents,
      note: note.trim() || null,
      created_by: user.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Pagamento registrado!"); setOpen(false); setAmount(""); setNote(""); setChildId(""); load(); }
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
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao limpar fotos");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Pagamentos</h2>
          <p className="text-muted-foreground text-sm">Saldos e histórico de resgates.</p>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={cleaning}>
                <ImageOff className="w-4 h-4" /> {cleaning ? "Limpando..." : "Limpar fotos antigas"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar fotos com mais de 6 meses?</AlertDialogTitle>
                <AlertDialogDescription>
                  As fotos das atividades enviadas há mais de 6 meses serão apagadas permanentemente do armazenamento. O histórico de aprovações e o saldo das crianças não serão afetados — apenas as imagens.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={cleanupPhotos}>Limpar fotos</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="hero"><Plus className="w-4 h-4" /> Registrar pagamento</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label>Criança</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={childId} onChange={e => setChildId(e.target.value)} required>
                  <option value="">Selecionar...</option>
                  {children.map(c => <option key={c.id} value={c.id}>{c.name} — saldo {formatBRL(balances[c.id] ?? 0)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="10,00" required />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children.map(c => (
          <Card key={c.id} className="border-0 shadow-card rounded-2xl bg-gradient-warm text-secondary-foreground">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2 opacity-90"><Wallet className="w-5 h-5" /> {c.name}</div>
              <div className="text-3xl font-display font-bold">{formatBRL(balances[c.id] ?? 0)}</div>
              <div className="text-xs opacity-80">saldo atual</div>
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
                  <span className="font-display font-bold text-destructive">- {formatBRL(p.amount_cents)}</span>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
