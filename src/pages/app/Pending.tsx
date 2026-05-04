import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatAuris, formatDateTime } from "@/lib/format";
import { AuriIcon } from "@/components/AuriIcon";

type Submission = {
  id: string; child_id: string; activity_id: string; photo_url: string | null;
  status: string; reward_auris: number; completed_at: string; review_note: string | null;
  child: { name: string } | null; activity: { name: string } | null;
};

const Pending = () => {
  const { profile, user } = useAuth();
  const [list, setList] = useState<Submission[]>([]);
  const [tab, setTab] = useState<"pendente" | "aprovado" | "recusado">("pendente");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    if (!profile?.family_id) return;
    const { data } = await supabase.from("submissions")
      .select("*, child:children(name), activity:activities(name)")
      .eq("family_id", profile.family_id).eq("status", tab)
      .order("submitted_at", { ascending: false }).limit(100);
    setList((data ?? []) as any);
  };
  useEffect(() => { load(); }, [profile?.family_id, tab]);

  const review = async (s: Submission, status: "aprovado" | "recusado") => {
    const { error } = await supabase.from("submissions").update({
      status, reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      review_note: notes[s.id] || null,
    }).eq("id", s.id);
    if (error) toast.error(error.message);
    else { toast.success(status === "aprovado" ? "Aprovado! 🎉" : "Recusado"); load(); }
  };

  const tabs = [
    { key: "pendente", label: "Pendentes", icon: Clock },
    { key: "aprovado", label: "Aprovadas", icon: Check },
    { key: "recusado", label: "Recusadas", icon: X },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold">Pendências</h2>
        <p className="text-muted-foreground text-sm">Aprove ou recuse o que as crianças enviaram.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <Button key={t.key} variant={tab === t.key ? "hero" : "outline"} size="sm" onClick={() => setTab(t.key)}>
            <t.icon className="w-4 h-4" /> {t.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {list.map(s => (
          <Card key={s.id} className="border-0 shadow-card rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {s.photo_url && <img src={s.photo_url} alt={s.activity?.name || "Prova"} className="w-full h-56 object-cover bg-muted" loading="lazy" />}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{s.activity?.name ?? "Atividade"}</div>
                    <div className="text-sm text-muted-foreground">{s.child?.name ?? "Criança"} · {formatDateTime(s.completed_at)}</div>
                  </div>
                  <Badge className="bg-gradient-reward text-accent-foreground border-0 inline-flex items-center gap-1">
                    <AuriIcon size={14} />{formatAuris(s.reward_auris)}
                  </Badge>
                </div>
                {s.review_note && <div className="text-sm bg-muted rounded-lg p-2">"{s.review_note}"</div>}
                {tab === "pendente" && (
                  <>
                    <Textarea placeholder="Observação (opcional)" value={notes[s.id] ?? ""} onChange={e => setNotes({ ...notes, [s.id]: e.target.value })} rows={2} />
                    <div className="flex gap-2">
                      <Button variant="success" className="flex-1" onClick={() => review(s, "aprovado")}><Check className="w-4 h-4" /> Aprovar</Button>
                      <Button variant="destructive" className="flex-1" onClick={() => review(s, "recusado")}><X className="w-4 h-4" /> Recusar</Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-muted-foreground text-sm col-span-full">Nenhuma submissão {tab === "pendente" ? "pendente" : tab === "aprovado" ? "aprovada" : "recusada"}.</p>}
      </div>
    </div>
  );
};

export default Pending;
