import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

type AlertItem = { familyId: string; familyName: string; value: string | number };
type Alerts = {
  inactive7d: AlertItem[];
  pendingHeavy: AlertItem[];
  noChildren: AlertItem[];
  noSubmissions: AlertItem[];
  staleMissions: AlertItem[];
};

const sections: { key: keyof Alerts; title: string; valueLabel: string }[] = [
  { key: "inactive7d", title: "Sem atividade há 7+ dias", valueLabel: "Última atividade" },
  { key: "pendingHeavy", title: "Muitas pendências de aprovação", valueLabel: "Pendentes" },
  { key: "noChildren", title: "Conta criada sem cadastrar filhos", valueLabel: "Criada em" },
  { key: "noSubmissions", title: "Filhos cadastrados sem submissões", valueLabel: "Cadastro em" },
  { key: "staleMissions", title: "Missões sem progresso há 14+ dias", valueLabel: "Missões paradas" },
];

const fmt = (v: string | number) => {
  if (typeof v === "number") return v;
  if (v === "nunca") return "nunca";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR");
};

const AdminAlerts = () => {
  const { isAdmin, loading } = useAuth();
  const [data, setData] = useState<Alerts | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.rpc("admin_usage_alerts").then(({ data, error }) => {
      if (!error) setData(data as unknown as Alerts);
      setBusy(false);
    });
  }, [isAdmin]);

  if (loading || busy) return <Skeleton className="h-96 w-full" />;
  if (!isAdmin) return <Navigate to="/app" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold flex items-center gap-2">
          <AlertTriangle className="w-7 h-7 text-amber-500" /> Alertas de aderência
        </h2>
        <p className="text-muted-foreground">Famílias que podem precisar de atenção.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map(s => {
          const items = data?.[s.key] ?? [];
          return (
            <Card key={s.key} className="border-0 shadow-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{s.title}</span>
                  <span className="text-sm text-muted-foreground">{items.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-auto">
                {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma família neste alerta.</p>}
                {items.map(it => (
                  <div key={it.familyId + s.key} className="flex justify-between p-2 rounded-lg bg-muted/40 text-sm">
                    <span className="font-medium">{it.familyName}</span>
                    <span className="text-muted-foreground">{s.valueLabel}: {fmt(it.value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminAlerts;
