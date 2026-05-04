import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, ListChecks, ClipboardCheck, Sparkles } from "lucide-react";
import { formatAuris, formatBRL, aurisToBRL } from "@/lib/format";
import { AuriIcon } from "@/components/AuriIcon";
import { Link } from "react-router-dom";

type Stats = {
  childrenCount: number;
  activitiesCount: number;
  pending: number;
  approvedThisMonth: number;
  earnedThisMonthAuris: number;
};

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [topKids, setTopKids] = useState<{ id: string; name: string; balance: number; earned: number }[]>([]);
  const [aurisPerReal, setAurisPerReal] = useState(1);

  useEffect(() => {
    const load = async () => {
      if (!profile?.family_id) return;
      const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);

      const [famRes, kidsRes, actsRes, pendRes, monthRes, allApproved, paymentsRes] = await Promise.all([
        supabase.from("families").select("auris_per_real").eq("id", profile.family_id).maybeSingle(),
        supabase.from("children").select("id, name").eq("family_id", profile.family_id).eq("active", true),
        supabase.from("activities").select("id", { count: "exact", head: true }).eq("family_id", profile.family_id).eq("active", true),
        supabase.from("submissions").select("id", { count: "exact", head: true }).eq("family_id", profile.family_id).eq("status", "pendente"),
        supabase.from("submissions").select("reward_auris", { count: "exact" }).eq("family_id", profile.family_id).eq("status", "aprovado").gte("completed_at", startMonth.toISOString()),
        supabase.from("submissions").select("child_id, reward_auris").eq("family_id", profile.family_id).eq("status", "aprovado"),
        supabase.from("payments").select("child_id, auris_redeemed").eq("family_id", profile.family_id),
      ]);

      setAurisPerReal(famRes.data?.auris_per_real ?? 1);
      const earned = (monthRes.data ?? []).reduce((s, r) => s + (r.reward_auris ?? 0), 0);

      const earnedTotals = new Map<string, number>();
      const balances = new Map<string, number>();
      (allApproved.data ?? []).forEach(r => {
        earnedTotals.set(r.child_id, (earnedTotals.get(r.child_id) ?? 0) + (r.reward_auris ?? 0));
        balances.set(r.child_id, (balances.get(r.child_id) ?? 0) + (r.reward_auris ?? 0));
      });
      (paymentsRes.data ?? []).forEach(r => balances.set(r.child_id, (balances.get(r.child_id) ?? 0) - (r.auris_redeemed ?? 0)));

      const top = (kidsRes.data ?? [])
        .map(k => ({ id: k.id, name: k.name, balance: balances.get(k.id) ?? 0, earned: earnedTotals.get(k.id) ?? 0 }))
        .sort((a, b) => b.balance - a.balance);

      setTopKids(top);
      setStats({
        childrenCount: kidsRes.data?.length ?? 0,
        activitiesCount: actsRes.count ?? 0,
        pending: pendRes.count ?? 0,
        approvedThisMonth: monthRes.count ?? 0,
        earnedThisMonthAuris: earned,
      });
    };
    load();
  }, [profile?.family_id]);

  const cards = [
    { label: "Crianças", value: stats?.childrenCount ?? "—", icon: Users, color: "bg-gradient-primary text-primary-foreground", to: "/app/criancas" },
    { label: "Atividades ativas", value: stats?.activitiesCount ?? "—", icon: ListChecks, color: "bg-gradient-warm text-secondary-foreground", to: "/app/atividades" },
    { label: "Pendentes", value: stats?.pending ?? "—", icon: ClipboardCheck, color: "bg-warning text-warning-foreground", to: "/app/pendencias" },
    {
      label: "Auris no mês",
      value: stats ? <span className="inline-flex items-center gap-1"><AuriIcon size={20} />{formatAuris(stats.earnedThisMonthAuris)}</span> : "—",
      icon: Trophy,
      color: "bg-gradient-reward text-accent-foreground",
      to: "/app/auris-mes",
    },
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
          <Link key={c.label} to={c.to} className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-2xl">
            <Card className="border-0 shadow-card rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <CardContent className="p-0">
                <div className={`p-4 ${c.color}`}>
                  <c.icon className="w-6 h-6 mb-2 opacity-90" />
                  <div className="text-2xl font-display font-bold">{c.value}</div>
                  <div className="text-xs opacity-90">{c.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
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
              <div key={k.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 gap-3">
                <span className="font-medium">{k.name}</span>
                <div className="flex flex-col items-end leading-tight">
                  <span className="font-display font-bold text-lg text-primary inline-flex items-center gap-1">
                    <AuriIcon size={18} /> {formatAuris(k.balance)}
                    <span className="text-xs text-muted-foreground font-normal ml-1">≈ {formatBRL(aurisToBRL(k.balance, aurisPerReal))}</span>
                  </span>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    Total ganho: <AuriIcon size={11} /> {formatAuris(k.earned)}
                  </span>
                </div>
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
            <Link to="/app/grupos" className="block p-3 rounded-xl bg-card/15 hover:bg-card/25 transition-smooth">
              👥 Grupos compartilhados
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
