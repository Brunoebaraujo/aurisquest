import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, ListChecks, ClipboardCheck, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { Link } from "react-router-dom";

type Stats = {
  childrenCount: number;
  activitiesCount: number;
  pending: number;
  approvedThisMonth: number;
  earnedThisMonthCents: number;
};

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [topKids, setTopKids] = useState<{ id: string; name: string; balance: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!profile?.family_id) return;
      const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);

      const [kidsRes, actsRes, pendRes, monthRes, allApproved, paymentsRes] = await Promise.all([
        supabase.from("children").select("id, name").eq("family_id", profile.family_id).eq("active", true),
        supabase.from("activities").select("id", { count: "exact", head: true }).eq("family_id", profile.family_id).eq("active", true),
        supabase.from("submissions").select("id", { count: "exact", head: true }).eq("family_id", profile.family_id).eq("status", "pendente"),
        supabase.from("submissions").select("reward_amount_cents", { count: "exact" }).eq("family_id", profile.family_id).eq("status", "aprovado").gte("completed_at", startMonth.toISOString()),
        supabase.from("submissions").select("child_id, reward_amount_cents").eq("family_id", profile.family_id).eq("status", "aprovado"),
        supabase.from("payments").select("child_id, amount_cents").eq("family_id", profile.family_id),
      ]);

      const earned = (monthRes.data ?? []).reduce((s, r) => s + (r.reward_amount_cents ?? 0), 0);

      const balances = new Map<string, number>();
      (allApproved.data ?? []).forEach(r => balances.set(r.child_id, (balances.get(r.child_id) ?? 0) + r.reward_amount_cents));
      (paymentsRes.data ?? []).forEach(r => balances.set(r.child_id, (balances.get(r.child_id) ?? 0) - r.amount_cents));

      const top = (kidsRes.data ?? [])
        .map(k => ({ id: k.id, name: k.name, balance: balances.get(k.id) ?? 0 }))
        .sort((a, b) => b.balance - a.balance);

      setTopKids(top);
      setStats({
        childrenCount: kidsRes.data?.length ?? 0,
        activitiesCount: actsRes.count ?? 0,
        pending: pendRes.count ?? 0,
        approvedThisMonth: monthRes.count ?? 0,
        earnedThisMonthCents: earned,
      });
    };
    load();
  }, [profile?.family_id]);

  const cards = [
    { label: "Crianças", value: stats?.childrenCount ?? "—", icon: Users, color: "bg-gradient-primary text-primary-foreground" },
    { label: "Atividades ativas", value: stats?.activitiesCount ?? "—", icon: ListChecks, color: "bg-gradient-warm text-secondary-foreground" },
    { label: "Pendentes", value: stats?.pending ?? "—", icon: ClipboardCheck, color: "bg-warning text-warning-foreground" },
    { label: "Ganho no mês", value: stats ? formatBRL(stats.earnedThisMonthCents) : "—", icon: Trophy, color: "bg-gradient-reward text-accent-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-accent" /> Olá, {profile?.full_name || "responsável"}!
        </h2>
        <p className="text-muted-foreground">Aqui está o resumo da sua família hoje.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label} className="border-0 shadow-card rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className={`p-4 ${c.color}`}>
                <c.icon className="w-6 h-6 mb-2 opacity-90" />
                <div className="text-2xl font-display font-bold">{c.value}</div>
                <div className="text-xs opacity-90">{c.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Saldos por criança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topKids.length === 0 && <p className="text-sm text-muted-foreground">Cadastre crianças para começar.</p>}
            {topKids.map(k => (
              <div key={k.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="font-medium">{k.name}</span>
                <span className="font-display font-bold text-lg text-primary">{formatBRL(k.balance)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card rounded-2xl bg-gradient-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-lg">Atalhos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/app/pendencias" className="block p-3 rounded-xl bg-card/15 hover:bg-card/25 transition-smooth">
              ✅ Revisar pendências
            </Link>
            <Link to="/app/atividades" className="block p-3 rounded-xl bg-card/15 hover:bg-card/25 transition-smooth">
              ➕ Adicionar nova atividade
            </Link>
            <Link to="/app/criancas" className="block p-3 rounded-xl bg-card/15 hover:bg-card/25 transition-smooth">
              👧 Cadastrar criança
            </Link>
            <Link to="/app/pagamentos" className="block p-3 rounded-xl bg-card/15 hover:bg-card/25 transition-smooth">
              💰 Registrar pagamento
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
