import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "lucide-react";
import { AuriIcon } from "@/components/AuriIcon";
import { formatAuris } from "@/lib/format";

type Row = {
  id: string;
  completed_at: string;
  reward_auris: number;
  child_id: string;
  activity_id: string;
  status: string;
};

const monthRange = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
};

const AurisMonth = () => {
  const { profile } = useAuth();
  const [ym, setYm] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [children, setChildren] = useState<Record<string, string>>({});
  const [activities, setActivities] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      if (!profile?.family_id) return;
      const { start, end } = monthRange(ym);
      const [subRes, kidsRes, actsRes] = await Promise.all([
        supabase.from("submissions")
          .select("id, completed_at, reward_auris, child_id, activity_id, status")
          .eq("family_id", profile.family_id)
          .eq("status", "aprovado")
          .gte("completed_at", start.toISOString())
          .lt("completed_at", end.toISOString())
          .order("completed_at", { ascending: false }),
        supabase.from("children").select("id, name").eq("family_id", profile.family_id),
        supabase.from("activities").select("id, name").eq("family_id", profile.family_id),
      ]);
      setRows((subRes.data ?? []) as Row[]);
      setChildren(Object.fromEntries((kidsRes.data ?? []).map(c => [c.id, c.name])));
      setActivities(Object.fromEntries((actsRes.data ?? []).map(a => [a.id, a.name])));
    };
    load();
  }, [profile?.family_id, ym]);

  const total = useMemo(() => rows.reduce((s, r) => s + (r.reward_auris ?? 0), 0), [rows]);

  const byChild = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(r => map.set(r.child_id, (map.get(r.child_id) ?? 0) + (r.reward_auris ?? 0)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app"><ChevronLeft className="w-4 h-4" /> Voltar</Link>
        </Button>
        <h2 className="text-2xl font-display font-bold">Auris do mês</h2>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Mês:</label>
        <Input type="month" value={ym} onChange={e => setYm(e.target.value)} className="w-48" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-card rounded-2xl">
          <CardHeader><CardTitle className="text-lg">Total no mês</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold inline-flex items-center gap-2">
              <AuriIcon size={28} /> {formatAuris(total)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">{rows.length} atividade(s) aprovada(s)</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card rounded-2xl">
          <CardHeader><CardTitle className="text-lg">Por criança</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byChild.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro no mês.</p>}
            {byChild.map(([cid, val]) => (
              <div key={cid} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="font-medium">{children[cid] ?? "—"}</span>
                <span className="font-display font-bold inline-flex items-center gap-1">
                  <AuriIcon size={16} /> {formatAuris(val)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-card rounded-2xl">
        <CardHeader><CardTitle className="text-lg">Detalhamento</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Criança</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead className="text-right">Auris</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sem submissões aprovadas neste mês.</TableCell></TableRow>
              )}
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.completed_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{children[r.child_id] ?? "—"}</TableCell>
                  <TableCell>{activities[r.activity_id] ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    <span className="inline-flex items-center gap-1"><AuriIcon size={14} /> {formatAuris(r.reward_auris)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AurisMonth;
