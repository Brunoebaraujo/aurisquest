import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, CheckCircle2, XCircle, Wallet, Trash2 } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Child = { id: string; name: string };
type Activity = { id: string; name: string };
type Submission = {
  id: string;
  child_id: string;
  activity_id: string;
  status: "pendente" | "aprovado" | "recusado";
  reward_auris: number;
  completed_at: string;
  photo_url: string | null;
  review_note: string | null;
};
type Payment = { child_id: string; auris_redeemed: number; paid_at: string };

type DayBuckets = {
  pendingAuris: number;
  approvedUnpaidAuris: number;
  approvedPaidAuris: number;
  count: number;
};

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const CalendarPage = () => {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);
  const [openDayDate, setOpenDayDate] = useState<Date | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!profile?.family_id) return;
    Promise.all([
      supabase.from("children").select("id, name").eq("family_id", profile.family_id).eq("active", true),
      supabase.from("activities").select("id, name").eq("family_id", profile.family_id),
    ]).then(([c, a]) => {
      setChildren(c.data ?? []);
      setActivities(a.data ?? []);
    });
  }, [profile?.family_id]);

  useEffect(() => {
    const load = async () => {
      if (!profile?.family_id) return;
      const [subRes, payRes] = await Promise.all([
        supabase.from("submissions")
          .select("id, child_id, activity_id, status, reward_auris, completed_at, photo_url, review_note")
          .eq("family_id", profile.family_id),
        supabase.from("payments")
          .select("child_id, auris_redeemed, paid_at")
          .eq("family_id", profile.family_id),
      ]);
      setSubmissions((subRes.data ?? []) as Submission[]);
      setPayments((payRes.data ?? []) as Payment[]);
    };
    load();
  }, [profile?.family_id, cursor]);

  // Compute per-submission paid status using FIFO allocation per child
  const paidMap = useMemo(() => {
    const map = new Map<string, boolean>(); // submission.id -> fully paid?
    const partialMap = new Map<string, number>(); // submission.id -> paid cents

    const byChild = new Map<string, Submission[]>();
    submissions.filter(s => s.status === "aprovado").forEach(s => {
      const arr = byChild.get(s.child_id) ?? [];
      arr.push(s);
      byChild.set(s.child_id, arr);
    });

    const paymentsByChild = new Map<string, number>();
    payments.forEach(p => {
      paymentsByChild.set(p.child_id, (paymentsByChild.get(p.child_id) ?? 0) + p.auris_redeemed);
    });

    byChild.forEach((subs, childId) => {
      subs.sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
      let pool = paymentsByChild.get(childId) ?? 0;
      for (const s of subs) {
        if (pool >= s.reward_auris) {
          map.set(s.id, true);
          pool -= s.reward_auris;
        } else if (pool > 0) {
          map.set(s.id, false);
          partialMap.set(s.id, pool);
          pool = 0;
        } else {
          map.set(s.id, false);
        }
      }
    });

    return { fullyPaid: map, partial: partialMap };
  }, [submissions, payments]);

  // Build day buckets for current month
  const { days, monthBuckets } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startWeekday = first.getDay();
    const totalCells = Math.ceil((startWeekday + last.getDate()) / 7) * 7;

    const buckets = new Map<string, DayBuckets>();
    submissions.forEach(s => {
      if (selectedChild !== "all" && s.child_id !== selectedChild) return;
      const d = new Date(s.completed_at);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const key = dayKey(d);
      const b = buckets.get(key) ?? { pendingAuris: 0, approvedUnpaidAuris: 0, approvedPaidAuris: 0, count: 0 };
      b.count += 1;
      if (s.status === "pendente") {
        b.pendingAuris += s.reward_auris;
      } else if (s.status === "aprovado") {
        const fullyPaid = paidMap.fullyPaid.get(s.id);
        const partial = paidMap.partial.get(s.id) ?? 0;
        if (fullyPaid) {
          b.approvedPaidAuris += s.reward_auris;
        } else if (partial > 0) {
          b.approvedPaidAuris += partial;
          b.approvedUnpaidAuris += s.reward_auris - partial;
        } else {
          b.approvedUnpaidAuris += s.reward_auris;
        }
      }
      buckets.set(key, b);
    });

    const cells: { date: Date | null; key: string; bucket?: DayBuckets }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null, key: `e-${i}` });
    for (let day = 1; day <= last.getDate(); day++) {
      const date = new Date(year, month, day);
      const key = dayKey(date);
      cells.push({ date, key, bucket: buckets.get(key) });
    }
    while (cells.length < totalCells) cells.push({ date: null, key: `e2-${cells.length}` });

    const totals: DayBuckets = { pendingAuris: 0, approvedUnpaidAuris: 0, approvedPaidAuris: 0, count: 0 };
    buckets.forEach(b => {
      totals.pendingAuris += b.pendingAuris;
      totals.approvedUnpaidAuris += b.approvedUnpaidAuris;
      totals.approvedPaidAuris += b.approvedPaidAuris;
      totals.count += b.count;
    });

    return { days: cells, monthBuckets: totals };
  }, [submissions, paidMap, cursor, selectedChild]);

  const goPrev = () => { const d = new Date(cursor); d.setMonth(d.getMonth() - 1); setCursor(d); };
  const goNext = () => { const d = new Date(cursor); d.setMonth(d.getMonth() + 1); setCursor(d); };
  const today = new Date();
  const todayKey = dayKey(today);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-display font-bold flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-primary" /> Painel mensal
          </h2>
          <p className="text-muted-foreground">Veja como cada dia está indo.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as crianças</SelectItem>
              {children.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-0 shadow-card rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-display capitalize">
            {monthNames[cursor.getMonth()]} de {cursor.getFullYear()}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={goPrev}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); setCursor(d); }}>Hoje</Button>
            <Button variant="ghost" size="icon" onClick={goNext}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map(w => (
              <div key={w} className="text-xs font-semibold text-muted-foreground text-center py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(cell => {
              if (!cell.date) {
                return <div key={cell.key} className="aspect-square rounded-xl bg-muted/30" />;
              }
              const b = cell.bucket;
              const isToday = cell.key === todayKey;
              const hasPending = !!b && b.pendingAuris > 0;
              const hasUnpaid = !!b && b.approvedUnpaidAuris > 0;
              const hasPaid = !!b && b.approvedPaidAuris > 0;
              const isEmpty = !b;

              return (
                <button
                  type="button"
                  key={cell.key}
                  onClick={() => { setOpenDayKey(cell.key); setOpenDayDate(cell.date); }}
                  className={`aspect-square rounded-xl p-1.5 flex flex-col justify-between border transition-smooth hover:scale-[1.02] hover:shadow-card text-left cursor-pointer ${
                    isEmpty ? "bg-muted/40 border-border/50" : "bg-card border-border shadow-soft"
                  } ${isToday ? "ring-2 ring-primary" : ""}`}
                  title={
                    b
                      ? `Pendente: ${formatBRL(b.pendingAuris)} • Não pago: ${formatBRL(b.approvedUnpaidAuris)} • Pago: ${formatBRL(b.approvedPaidAuris)}`
                      : "Sem atividades"
                  }
                >
                  <div className={`text-xs font-semibold ${isEmpty ? "text-muted-foreground" : "text-foreground"}`}>
                    {cell.date.getDate()}
                  </div>
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    {isEmpty && <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />}
                    {hasPending && <span className="w-2 h-2 rounded-full bg-warning shadow-sm" />}
                    {hasUnpaid && <span className="w-2 h-2 rounded-full bg-destructive shadow-sm" />}
                    {hasPaid && <span className="w-2 h-2 rounded-full bg-success shadow-sm" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-muted-foreground/40" /> Sem atividades</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-warning" /> Pendente de análise</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-destructive" /> Aprovado e não pago</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-success" /> Aprovado e pago</div>
          </div>
        </CardContent>
      </Card>

      {/* Month summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-card rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Atividades no mês</div>
            <div className="text-2xl font-display font-bold">{monthBuckets.count}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card rounded-2xl bg-warning/10">
          <CardContent className="p-4">
            <div className="text-xs text-warning-foreground/80">Pendente</div>
            <div className="text-2xl font-display font-bold">{formatBRL(monthBuckets.pendingAuris)}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card rounded-2xl bg-destructive/10">
          <CardContent className="p-4">
            <div className="text-xs text-destructive">A pagar</div>
            <div className="text-2xl font-display font-bold">{formatBRL(monthBuckets.approvedUnpaidAuris)}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card rounded-2xl bg-success/10">
          <CardContent className="p-4">
            <div className="text-xs text-success">Pago</div>
            <div className="text-2xl font-display font-bold">{formatBRL(monthBuckets.approvedPaidAuris)}</div>
          </CardContent>
        </Card>
      </div>

      <DayDetailsDialog
        open={!!openDayKey}
        onOpenChange={(o) => { if (!o) { setOpenDayKey(null); setOpenDayDate(null); } }}
        date={openDayDate}
        submissions={submissions.filter(s => {
          if (selectedChild !== "all" && s.child_id !== selectedChild) return false;
          return openDayKey ? dayKey(new Date(s.completed_at)) === openDayKey : false;
        })}
        children={children}
        activities={activities}
        paidMap={paidMap}
        onDeleted={(id) => setSubmissions(prev => prev.filter(s => s.id !== id))}
      />
    </div>
  );
};

type DayDetailsProps = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: Date | null;
  submissions: Submission[];
  children: Child[];
  activities: Activity[];
  paidMap: { fullyPaid: Map<string, boolean>; partial: Map<string, number> };
  onDeleted: (id: string) => void;
};

const DayDetailsDialog = ({ open, onOpenChange, date, submissions, children, activities, paidMap, onDeleted }: DayDetailsProps) => {
  const childName = (id: string) => children.find(c => c.id === id)?.name ?? "—";
  const activityName = (id: string) => activities.find(a => a.id === id)?.name ?? "Atividade";

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("submissions").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover: " + error.message); return; }
    toast.success("Atividade removida");
    onDeleted(id);
  };

  const sorted = [...submissions].sort((a, b) =>
    new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  );

  const totals = sorted.reduce(
    (acc, s) => {
      if (s.status === "pendente") acc.pending += s.reward_auris;
      else if (s.status === "aprovado") {
        const fully = paidMap.fullyPaid.get(s.id);
        const partial = paidMap.partial.get(s.id) ?? 0;
        if (fully) acc.paid += s.reward_auris;
        else { acc.paid += partial; acc.unpaid += s.reward_auris - partial; }
      } else acc.refused += s.reward_auris;
      return acc;
    },
    { pending: 0, unpaid: 0, paid: 0, refused: 0 }
  );

  const dateLabel = date
    ? date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl capitalize">{dateLabel}</DialogTitle>
          <DialogDescription>
            {sorted.length === 0
              ? "Nenhuma atividade registrada neste dia."
              : `${sorted.length} ${sorted.length === 1 ? "ocorrência" : "ocorrências"} no dia.`}
          </DialogDescription>
        </DialogHeader>

        {sorted.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-xl bg-warning/10 p-2"><div className="text-[10px] text-warning-foreground/70">Pendente</div><div className="font-display font-bold">{formatBRL(totals.pending)}</div></div>
            <div className="rounded-xl bg-destructive/10 p-2"><div className="text-[10px] text-destructive">A pagar</div><div className="font-display font-bold">{formatBRL(totals.unpaid)}</div></div>
            <div className="rounded-xl bg-success/10 p-2"><div className="text-[10px] text-success">Pago</div><div className="font-display font-bold">{formatBRL(totals.paid)}</div></div>
            <div className="rounded-xl bg-muted p-2"><div className="text-[10px] text-muted-foreground">Recusado</div><div className="font-display font-bold">{formatBRL(totals.refused)}</div></div>
          </div>
        )}

        <div className="space-y-3">
          {sorted.map(s => {
            const isApproved = s.status === "aprovado";
            const fully = paidMap.fullyPaid.get(s.id);
            const partial = paidMap.partial.get(s.id) ?? 0;
            const payState = isApproved
              ? (fully ? "pago" : partial > 0 ? "parcial" : "a pagar")
              : null;
            const dotClass =
              s.status === "pendente" ? "bg-warning"
              : s.status === "recusado" ? "bg-muted-foreground"
              : payState === "pago" ? "bg-success"
              : payState === "parcial" ? "bg-gradient-to-r from-success to-destructive"
              : "bg-destructive";

            return (
              <div key={s.id} className="flex gap-3 p-3 rounded-xl border bg-card shadow-soft">
                {s.photo_url ? (
                  <img src={s.photo_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs shrink-0">sem foto</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold truncate">{activityName(s.activity_id)}</div>
                      <div className="text-xs text-muted-foreground">{childName(s.child_id)} • {new Date(s.completed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div className="font-display font-bold text-primary whitespace-nowrap">{formatBRL(s.reward_auris)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="outline" className="gap-1">
                      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                      {s.status === "pendente" && (<><Clock className="w-3 h-3" /> Pendente</>)}
                      {s.status === "aprovado" && (<><CheckCircle2 className="w-3 h-3" /> Aprovado</>)}
                      {s.status === "recusado" && (<><XCircle className="w-3 h-3" /> Recusado</>)}
                    </Badge>
                    {isApproved && payState === "pago" && (
                      <Badge className="bg-success text-success-foreground gap-1"><Wallet className="w-3 h-3" /> Pago</Badge>
                    )}
                    {isApproved && payState === "parcial" && (
                      <Badge className="bg-warning text-warning-foreground gap-1"><Wallet className="w-3 h-3" /> Pago {formatBRL(partial)} de {formatBRL(s.reward_auris)}</Badge>
                    )}
                    {isApproved && payState === "a pagar" && (
                      <Badge className="bg-destructive text-destructive-foreground gap-1"><Wallet className="w-3 h-3" /> A pagar</Badge>
                    )}
                  </div>
                  {s.review_note && (
                    <p className="text-xs text-muted-foreground mt-2 italic">"{s.review_note}"</p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0" title="Remover atividade">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover esta atividade?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Vai apagar permanentemente "{activityName(s.activity_id)}" de {childName(s.child_id)} ({formatBRL(s.reward_auris)}). Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalendarPage;
