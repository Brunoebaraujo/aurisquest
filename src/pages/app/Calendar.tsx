import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { formatBRL } from "@/lib/format";

type Child = { id: string; name: string };
type Submission = {
  id: string;
  child_id: string;
  status: "pendente" | "aprovado" | "recusado";
  reward_amount_cents: number;
  completed_at: string;
};
type Payment = { child_id: string; amount_cents: number; paid_at: string };

type DayBuckets = {
  pendingCents: number;
  approvedUnpaidCents: number;
  approvedPaidCents: number;
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
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!profile?.family_id) return;
    supabase.from("children").select("id, name").eq("family_id", profile.family_id).eq("active", true)
      .then(({ data }) => setChildren(data ?? []));
  }, [profile?.family_id]);

  useEffect(() => {
    const load = async () => {
      if (!profile?.family_id) return;
      // Load ALL approved submissions and payments (need history for chronological allocation)
      const [subRes, payRes] = await Promise.all([
        supabase.from("submissions")
          .select("id, child_id, status, reward_amount_cents, completed_at")
          .eq("family_id", profile.family_id),
        supabase.from("payments")
          .select("child_id, amount_cents, paid_at")
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
      paymentsByChild.set(p.child_id, (paymentsByChild.get(p.child_id) ?? 0) + p.amount_cents);
    });

    byChild.forEach((subs, childId) => {
      subs.sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
      let pool = paymentsByChild.get(childId) ?? 0;
      for (const s of subs) {
        if (pool >= s.reward_amount_cents) {
          map.set(s.id, true);
          pool -= s.reward_amount_cents;
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
      const b = buckets.get(key) ?? { pendingCents: 0, approvedUnpaidCents: 0, approvedPaidCents: 0, count: 0 };
      b.count += 1;
      if (s.status === "pendente") {
        b.pendingCents += s.reward_amount_cents;
      } else if (s.status === "aprovado") {
        const fullyPaid = paidMap.fullyPaid.get(s.id);
        const partial = paidMap.partial.get(s.id) ?? 0;
        if (fullyPaid) {
          b.approvedPaidCents += s.reward_amount_cents;
        } else if (partial > 0) {
          b.approvedPaidCents += partial;
          b.approvedUnpaidCents += s.reward_amount_cents - partial;
        } else {
          b.approvedUnpaidCents += s.reward_amount_cents;
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

    const totals: DayBuckets = { pendingCents: 0, approvedUnpaidCents: 0, approvedPaidCents: 0, count: 0 };
    buckets.forEach(b => {
      totals.pendingCents += b.pendingCents;
      totals.approvedUnpaidCents += b.approvedUnpaidCents;
      totals.approvedPaidCents += b.approvedPaidCents;
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
              const hasPending = !!b && b.pendingCents > 0;
              const hasUnpaid = !!b && b.approvedUnpaidCents > 0;
              const hasPaid = !!b && b.approvedPaidCents > 0;
              const isEmpty = !b;

              return (
                <div
                  key={cell.key}
                  className={`aspect-square rounded-xl p-1.5 flex flex-col justify-between border transition-smooth hover:scale-[1.02] ${
                    isEmpty ? "bg-muted/40 border-border/50" : "bg-card border-border shadow-soft"
                  } ${isToday ? "ring-2 ring-primary" : ""}`}
                  title={
                    b
                      ? `Pendente: ${formatBRL(b.pendingCents)} • Não pago: ${formatBRL(b.approvedUnpaidCents)} • Pago: ${formatBRL(b.approvedPaidCents)}`
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
                </div>
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
            <div className="text-2xl font-display font-bold">{formatBRL(monthBuckets.pendingCents)}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card rounded-2xl bg-destructive/10">
          <CardContent className="p-4">
            <div className="text-xs text-destructive">A pagar</div>
            <div className="text-2xl font-display font-bold">{formatBRL(monthBuckets.approvedUnpaidCents)}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card rounded-2xl bg-success/10">
          <CardContent className="p-4">
            <div className="text-xs text-success">Pago</div>
            <div className="text-2xl font-display font-bold">{formatBRL(monthBuckets.approvedPaidCents)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarPage;
