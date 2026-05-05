import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

type PeriodPreset = "7d" | "30d" | "month" | "lastMonth" | "custom";

type Overview = {
  globals: Record<string, number>;
  series: {
    submissionsPerDay: { day: string; count: number }[];
    activeFamiliesPerWeek: { week: string; count: number }[];
    approvedVsRejected: { day: string; aprovado: number; recusado: number }[];
    aurisPerMonth: { month: string; auris: number }[];
  };
  funnel: { invited: number; activated: number; withChild: number; firstSubmission: number; firstApproval: number };
};

type FamilyRow = {
  familyId: string;
  familyName: string;
  groupName: string | null;
  status: string;
  parentsActive: number;
  childrenCount: number;
  childrenActive: number;
  submissionsPeriod: number;
  pending: number;
  missionsInProgress: number;
  missionsCompleted: number;
  aurisDistributed: number;
  lastActivityAt: string | null;
  adherenceScore: number;
};

const computeRange = (preset: PeriodPreset, custom?: { from?: Date; to?: Date }) => {
  const now = new Date();
  let from = new Date(now), to = new Date(now);
  if (preset === "7d") { from = new Date(now); from.setDate(now.getDate() - 7); }
  else if (preset === "30d") { from = new Date(now); from.setDate(now.getDate() - 30); }
  else if (preset === "month") { from = new Date(now.getFullYear(), now.getMonth(), 1); }
  else if (preset === "lastMonth") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === "custom") {
    from = custom?.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    to = custom?.to ?? now;
  }
  return { from, to };
};

const scoreBadge = (s: number) => {
  if (s >= 80) return <Badge className="bg-emerald-500 text-white">Alta {s}</Badge>;
  if (s >= 50) return <Badge className="bg-amber-500 text-white">Média {s}</Badge>;
  return <Badge className="bg-red-500 text-white">Baixa {s}</Badge>;
};

const AdminUsage = () => {
  const { isAdmin, loading } = useAuth();
  const [preset, setPreset] = useState<PeriodPreset>("30d");
  const [customFrom, setCustomFrom] = useState<Date>();
  const [customTo, setCustomTo] = useState<Date>();
  const [groupId, setGroupId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const range = useMemo(() => computeRange(preset, { from: customFrom, to: customTo }), [preset, customFrom, customTo]);

  useEffect(() => {
    supabase.from("shared_groups").select("id, name").then(({ data }) => setGroups(data ?? []));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      setBusy(true);
      const args = {
        _from: range.from.toISOString(),
        _to: range.to.toISOString(),
        _group_id: groupId === "all" ? null : groupId,
        _family_status: status === "all" ? null : status,
      };
      const [ov, fam] = await Promise.all([
        supabase.rpc("admin_usage_overview", args),
        supabase.rpc("admin_usage_families", args),
      ]);
      if (!ov.error) setOverview(ov.data as unknown as Overview);
      if (!fam.error) setFamilies((fam.data as unknown as FamilyRow[]) ?? []);
      setBusy(false);
    };
    load();
  }, [isAdmin, range.from, range.to, groupId, status]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!isAdmin) return <Navigate to="/app" replace />;

  const g = overview?.globals ?? {};
  const cards = [
    { label: "Famílias ativas", value: g.familiesActive ?? 0 },
    { label: "Crianças ativas", value: g.childrenActive ?? 0 },
    { label: "Submissões no período", value: g.submissionsTotal ?? 0 },
    { label: "Missões em andamento", value: g.missionsInProgress ?? 0 },
    { label: "Taxa de aprovação", value: `${g.approvalRate ?? 0}%` },
    { label: "Tempo médio aprovação", value: `${g.avgApprovalHours ?? 0}h` },
  ];

  const filteredFams = families.filter(f =>
    f.familyName.toLowerCase().includes(search.toLowerCase())
  );

  const funnel = overview?.funnel;
  const funnelData = funnel ? [
    { stage: "Convidadas", value: funnel.invited },
    { stage: "Ativadas", value: funnel.activated },
    { stage: "Com criança", value: funnel.withChild },
    { stage: "1ª submissão", value: funnel.firstSubmission },
    { stage: "1ª aprovação", value: funnel.firstApproval },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary" /> Utilização do app
        </h2>
        <p className="text-muted-foreground">Métricas agregadas por família. Sem acesso a conteúdo privado.</p>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-card rounded-2xl">
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Período</label>
            <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="month">Mês atual</SelectItem>
                <SelectItem value="lastMonth">Mês anterior</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {preset === "custom" && (
            <>
              <div>
                <label className="text-xs text-muted-foreground">De</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[160px] justify-start", !customFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customFrom ? format(customFrom, "dd/MM/yyyy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Até</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[160px] justify-start", !customTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customTo ? format(customTo, "dd/MM/yyyy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Grupo</label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(c => (
          <Card key={c.label} className="border-0 shadow-card rounded-2xl">
            <CardContent className="p-4">
              <div className="text-2xl font-display font-bold">{busy ? "…" : c.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Submissões por dia">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={overview?.series.submissionsPerDay ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={(d) => format(new Date(d), "dd/MM")} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(d) => format(new Date(d as string), "dd/MM/yyyy")} />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Famílias ativas por semana">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={overview?.series.activeFamiliesPerWeek ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tickFormatter={(d) => format(new Date(d), "dd/MM")} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(d) => format(new Date(d as string), "dd/MM/yyyy")} />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Aprovadas vs recusadas">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={overview?.series.approvedVsRejected ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={(d) => format(new Date(d), "dd/MM")} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(d) => format(new Date(d as string), "dd/MM/yyyy")} />
              <Legend />
              <Bar dataKey="aprovado" stackId="a" fill="hsl(var(--primary))" />
              <Bar dataKey="recusado" stackId="a" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Auris distribuídos por mês (12m)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={overview?.series.aurisPerMonth ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={(d) => format(new Date(d), "MMM/yy")} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(d) => format(new Date(d as string), "MMM/yyyy")} />
              <Line type="monotone" dataKey="auris" stroke="hsl(var(--accent))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Funil de ativação" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="stage" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tabela */}
      <Card className="border-0 shadow-card rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Famílias</CardTitle>
          <Input placeholder="Buscar família…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Família</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Resp. ativos</TableHead>
                <TableHead className="text-right">Crianças</TableHead>
                <TableHead className="text-right">Ativas</TableHead>
                <TableHead className="text-right">Submissões</TableHead>
                <TableHead className="text-right">Pendentes</TableHead>
                <TableHead className="text-right">Missões andam.</TableHead>
                <TableHead className="text-right">Concluídas</TableHead>
                <TableHead className="text-right">Auris</TableHead>
                <TableHead>Última atividade</TableHead>
                <TableHead>Aderência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFams.map(f => (
                <TableRow key={f.familyId}>
                  <TableCell className="font-medium">{f.familyName}</TableCell>
                  <TableCell className="text-muted-foreground">{f.groupName ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{f.status}</Badge></TableCell>
                  <TableCell className="text-right">{f.parentsActive}</TableCell>
                  <TableCell className="text-right">{f.childrenCount}</TableCell>
                  <TableCell className="text-right">{f.childrenActive}</TableCell>
                  <TableCell className="text-right">{f.submissionsPeriod}</TableCell>
                  <TableCell className="text-right">{f.pending}</TableCell>
                  <TableCell className="text-right">{f.missionsInProgress}</TableCell>
                  <TableCell className="text-right">{f.missionsCompleted}</TableCell>
                  <TableCell className="text-right">{f.aurisDistributed}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {f.lastActivityAt ? format(new Date(f.lastActivityAt), "dd/MM/yy HH:mm") : "—"}
                  </TableCell>
                  <TableCell>{scoreBadge(f.adherenceScore)}</TableCell>
                </TableRow>
              ))}
              {filteredFams.length === 0 && (
                <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground">Sem dados.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const ChartCard = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <Card className={cn("border-0 shadow-card rounded-2xl", className)}>
    <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default AdminUsage;
