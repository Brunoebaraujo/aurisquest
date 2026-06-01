import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { formatAuris, formatDateTime } from "@/lib/format";
import { AuriIcon } from "@/components/AuriIcon";

type Tab = "pendente" | "aprovado" | "recusado";

type ActivitySubmission = {
  id: string;
  kind: "activity";
  child_id: string;
  activity_id: string;
  title: string;
  child_name: string;
  photo_url: string | null;
  comment: string | null;
  status: string;
  reward_auris: number;
  submitted_at: string;
};

type SideQuestSubmission = {
  id: string;
  kind: "sidequest";
  child_id: string;
  title: string;
  child_name: string;
  photo_url: string | null;
  comment: string | null;
  status: string;
  reward_auris: number;
  submitted_at: string;
};

type ReviewItem = ActivitySubmission | SideQuestSubmission;

type ChildRow = { id: string; name: string };

type SubmissionRow = {
  id: string;
  child_id: string;
  activity_id: string;
  photo_url: string | null;
  status: string;
  reward_auris: number;
  completed_at: string;
  submitted_at?: string;
  review_note: string | null;
  child: { name: string } | null;
  activity: { name: string } | null;
};

type SideQuestRow = {
  id: string;
  child_id: string;
  title: string;
  child_comment: string | null;
  child_photo_url: string | null;
  completed_at: string | null;
  created_at: string;
  status: string;
  reward_auris: number;
};

const sideQuestStatusesForTab = (tab: Tab) => {
  if (tab === "aprovado") return ["concluida", "aprovado"];
  if (tab === "recusado") return ["recusado"];
  return ["pendente"];
};

const Pending = () => {
  const { profile, user } = useAuth();
  const [list, setList] = useState<ReviewItem[]>([]);
  const [tab, setTab] = useState<Tab>("pendente");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    if (!profile?.family_id) return;

    const sideQuestsQuery = supabase.from("side_quests") as any;
    const [submissionsRes, sideQuestsRes, childrenRes] = await Promise.all([
      supabase.from("submissions")
        .select("*, child:children(name), activity:activities(name)")
        .eq("family_id", profile.family_id)
        .eq("status", tab)
        .order("submitted_at", { ascending: false })
        .limit(100),
      sideQuestsQuery
        .select("id, child_id, title, child_comment, child_photo_url, completed_at, created_at, status, reward_auris")
        .eq("family_id", profile.family_id)
        .in("status", sideQuestStatusesForTab(tab))
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(100),
      supabase.from("children")
        .select("id, name")
        .eq("family_id", profile.family_id),
    ]);

    const childNames = new Map(((childrenRes.data ?? []) as ChildRow[]).map(child => [child.id, child.name]));
    const activityItems: ReviewItem[] = ((submissionsRes.data ?? []) as SubmissionRow[]).map(row => ({
      id: row.id,
      kind: "activity",
      child_id: row.child_id,
      activity_id: row.activity_id,
      title: row.activity?.name ?? "Atividade",
      child_name: row.child?.name ?? childNames.get(row.child_id) ?? "Criança",
      photo_url: row.photo_url,
      comment: row.review_note,
      status: row.status,
      reward_auris: row.reward_auris,
      submitted_at: row.submitted_at ?? row.completed_at,
    }));

    const sideQuestItems: ReviewItem[] = ((sideQuestsRes.data ?? []) as SideQuestRow[]).map(row => ({
      id: row.id,
      kind: "sidequest",
      child_id: row.child_id,
      title: row.title,
      child_name: childNames.get(row.child_id) ?? "Criança",
      photo_url: row.child_photo_url,
      comment: row.child_comment,
      status: row.status,
      reward_auris: row.reward_auris,
      submitted_at: row.completed_at ?? row.created_at,
    }));

    setList([...activityItems, ...sideQuestItems].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()));
  };

  useEffect(() => { load(); }, [profile?.family_id, tab]);

  const review = async (item: ReviewItem, status: "aprovado" | "recusado") => {
    if (item.kind === "activity") {
      const { error } = await supabase.from("submissions").update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        review_note: notes[item.id] || null,
      }).eq("id", item.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await (supabase.rpc as any)("review_side_quest", {
        _side_quest_id: item.id,
        _status: status,
      });
      if (error || data?.ok === false) {
        toast.error(data?.error ?? error?.message ?? "Erro ao revisar Side Quest");
        return;
      }
    }

    toast.success(status === "aprovado" ? "Aprovado! 🎉" : "Recusado");
    load();
  };

  const tabs = [
    { key: "pendente", label: "Pendentes", icon: Clock },
    { key: "aprovado", label: "Aprovadas", icon: Check },
    { key: "recusado", label: "Recusadas", icon: X },
  ] as const;

  const emptyText = useMemo(() => {
    if (tab === "pendente") return "Nenhuma submissão pendente.";
    if (tab === "aprovado") return "Nenhuma submissão aprovada.";
    return "Nenhuma submissão recusada.";
  }, [tab]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold">Pendências</h2>
        <p className="text-muted-foreground text-sm">Aprove ou recuse atividades e Daily Side Quests enviadas pelas crianças.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <Button key={t.key} variant={tab === t.key ? "hero" : "outline"} size="sm" onClick={() => setTab(t.key)}>
            <t.icon className="w-4 h-4" /> {t.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {list.map(item => (
          <Card key={`${item.kind}-${item.id}`} className="border-0 shadow-card rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {item.photo_url && <img src={item.photo_url} alt={item.title} className="w-full h-56 object-contain bg-muted" loading="lazy" />}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold truncate">{item.title}</div>
                      {item.kind === "sidequest" && (
                        <Badge variant="outline" className="gap-1 bg-violet-50 text-violet-700 border-violet-200">
                          <ScrollText className="w-3 h-3" /> Daily Side Quest
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{item.child_name} · {formatDateTime(item.submitted_at)}</div>
                  </div>
                  <Badge className="bg-gradient-reward text-accent-foreground border-0 inline-flex items-center gap-1">
                    <AuriIcon size={14} />{formatAuris(item.reward_auris)}
                  </Badge>
                </div>
                {item.comment && (
                  <div className="text-sm bg-muted rounded-lg p-2">
                    "{item.comment}"
                  </div>
                )}
                {tab === "pendente" && (
                  <>
                    {item.kind === "activity" && (
                      <Textarea placeholder="Observação (opcional)" value={notes[item.id] ?? ""} onChange={e => setNotes({ ...notes, [item.id]: e.target.value })} rows={2} />
                    )}
                    <div className="flex gap-2">
                      <Button variant="success" className="flex-1" onClick={() => review(item, "aprovado")}><Check className="w-4 h-4" /> Aprovar</Button>
                      <Button variant="destructive" className="flex-1" onClick={() => review(item, "recusado")}><X className="w-4 h-4" /> Recusar</Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-muted-foreground text-sm col-span-full">{emptyText}</p>}
      </div>
    </div>
  );
};

export default Pending;
