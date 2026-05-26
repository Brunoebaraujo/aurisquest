import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, ListChecks, ClipboardCheck, Sparkles } from "lucide-react";
import { formatAuris, formatBRL, aurisToBRL } from "@/lib/format";
import { AuriIcon } from "@/components/AuriIcon";
import { Link } from "react-router-dom";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { EquippedAvatar } from "@/components/cosmetics/EquippedAvatar";
import { useFamilyCosmetics } from "@/hooks/useFamilyCosmetics";
import { SideQuestInviteCard } from "@/components/sidequest/SideQuestInviteCard";

type ApprovedRow = { child_id: string; reward_auris: number; completed_at: string };
type KidRow = { id: string; name: string; created_at: string };

const PALETTE = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

function startOfWeek(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun
  x.setDate(x.getDate() - day);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function fmtBucket(d: Date, granularity: "week" | "month") {
  if (granularity === "month") {
    return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

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
  const [kids, setKids] = useState<KidRow[]>([]);
  const [approvedRows, setApprovedRows] = useState<ApprovedRow[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!profile?.family_id) return;
      const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);

      const [famRes, kidsRes, actsRes, pendRes, monthRes, allApproved, paymentsRes] = await Promise.all([
        supabase.from("families").select("auris_per_real").eq("id", profile.family_id).maybeSingle(),
        supabase.from("children").select("id, name, created_at").eq("family_id", profile.family_id).eq("active", true),
        supabase.from("activities").select("id", { count: "exact", head: true }).eq("family_id", profile.family_id).eq("active", true),
        supabase.from("submissions").select("id", { count: "exact", head: true }).eq("family_id", profile.family_id).eq("status", "pendente"),
        supabase.from("submissions").select("reward_auris", { count: "exact" }).eq("family_id", profile.family_id).eq("status", "aprovado").gte("completed_at", startMonth.toISOString()),
        supabase.from("submissions").select("child_id, reward_auris, completed_at").eq("family_id", profile.family_id).eq("status", "aprovado"),
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
      setKids((kidsRes.data ?? []) as KidRow[]);
      setApprovedRows((allApproved.data ?? []) as ApprovedRow[]);
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

  const cosmeticsMap = useFamilyCosmetics(topKids.map(k => k.id));

  const { chartData, chartConfig, granularity, kidsForChart } = useMemo(() => {
    const empty = { chartData: [] as any[], chartConfig: {} as ChartConfig, granularity: "week" as "week" | "month", kidsForChart: [] as KidRow[] };
    if (kids.length === 0) return empty;

    const oldest = kids.reduce<Date | null>((acc, k) => {
      const d = new Date(k.created_at);
      return !acc || d < acc ? d : acc;
    }, null);
    if (!oldest) return empty;

    const now = new Date();
    const ageWeeks = (now.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24 * 7);
    const gran: "week" | "month" = ageWeeks > 52 ? "month" : "week";

    const buckets: Date[] = [];
    const cursor = gran === "week" ? startOfWeek(oldest) : startOfMonth(oldest);
    const end = gran === "week" ? startOfWeek(now) : startOfMonth(now);
    while (cursor <= end) {
      buckets.push(new Date(cursor));
      if (gran === "week") cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
    }

    const sums = new Map<string, Map<number, number>>();
    kids.forEach(k => sums.set(k.id, new Map()));
    approvedRows.forEach(r => {
      if (!sums.has(r.child_id)) return;
      const d = new Date(r.completed_at);
      const b = gran === "week" ? startOfWeek(d) : startOfMonth(d);
      const m = sums.get(r.child_id)!;
      m.set(b.getTime(), (m.get(b.getTime()) ?? 0) + (r.reward_auris ?? 0));
    });

    const cumulative = new Map<string, number>();
    kids.forEach(k => cumulative.set(k.id, 0));
    const data = buckets.map(b => {
      const row: Record<string, any> = { bucket: fmtBucket(b, gran) };
      kids.forEach(k => {
        const created = new Date(k.created_at);
        const createdBucket = gran === "week" ? startOfWeek(created) : startOfMonth(created);
        if (b < createdBucket) {
          row[k.id] = null;
        } else {
          const inc = sums.get(k.id)!.get(b.getTime()) ?? 0;
          cumulative.set(k.id, (cumulative.get(k.id) ?? 0) + inc);
          row[k.id] = cumulative.get(k.id);
        }
      });
      return row;
    });

    const config: ChartConfig = {};
    kids.forEach((k, i) => {
      config[k.id] = { label: k.name, color: PALETTE[i % PALETTE.length] };
    });

    return { chartData: data, chartConfig: config, granularity: gran, kidsForChart: kids };
  }, [kids, approvedRows]);

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
              <Link
                key={k.id}
                to={`/app/criancas/${k.id}`}
                aria-label={`Abrir perfil de ${k.name}`}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50 gap-3 cursor-pointer hover:bg-muted/70 hover:shadow-sm active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <EquippedAvatar
                    equipment={cosmeticsMap[k.id]?.equipment ?? { avatar: null }}
                    size={44}
                    fallbackName={k.name}
                  />
                  <span className="font-medium truncate">{k.name}</span>
                </div>
                <div className="flex flex-col items-end leading-tight">
                  <span className="font-display font-bold text-lg text-primary inline-flex items-center gap-1">
                    <AuriIcon size={18} /> {formatAuris(k.balance)}
                    <span className="text-xs text-muted-foreground font-normal ml-1">≈ {formatBRL(aurisToBRL(k.balance, aurisPerReal))}</span>
                  </span>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    Total ganho: <AuriIcon size={11} /> {formatAuris(k.earned)}
                  </span>
                </div>
              </Link>
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

      <Card className="border-0 shadow-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            Auris aprovados acumulados por criança
            <span className="text-xs font-normal text-muted-foreground ml-2">
              ({granularity === "week" ? "escala semanal" : "escala mensal"})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kidsForChart.length === 0 || chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados suficientes ainda.</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {kidsForChart.map((k) => (
                  <Line
                    key={k.id}
                    type="monotone"
                    dataKey={k.id}
                    name={k.name}
                    stroke={`var(--color-${k.id})`}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
