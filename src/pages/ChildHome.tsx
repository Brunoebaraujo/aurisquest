import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Trophy, Camera, Sparkles, CheckCircle2, Clock, XCircle, LogOut, Award,
  CalendarDays, ChevronLeft, ChevronRight, Medal, Crown,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateTime } from "@/lib/format";

type ChildSession = { id: string; name: string; family_id: string; avatar_url?: string | null };
type Activity = { id: string; name: string; description: string | null; reward_amount_cents: number; category: string | null };
type Submission = { id: string; activity_id: string; status: string; reward_amount_cents: number; completed_at: string };
type FamilySubmission = Submission & { child_id: string };
type FamilyChild = { id: string; name: string; avatar_url: string | null };
type AwardItem = { id: string; mission_name: string; medal_url: string | null; awarded_at: string };
type RankItem = { child_id: string; name: string; avatar_url: string | null; approved_count: number; earned_cents: number; pending_count: number; medals_count: number };

const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const weekdays = ["D","S","T","Q","Q","S","S"];
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

const ChildHome = () => {
  const nav = useNavigate();
  const [child, setChild] = useState<ChildSession | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [familyChildren, setFamilyChildren] = useState<FamilyChild[]>([]);
  const [familySubs, setFamilySubs] = useState<FamilySubmission[]>([]);
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [calChildFilter, setCalChildFilter] = useState<string>("all");
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem("jk_child_token");
    localStorage.removeItem("jk_child");
    nav("/entrar", { replace: true });
  }, [nav]);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("jk_child_token");
    if (!token) { logout(); return; }
    const { data, error } = await supabase.rpc("get_child_dashboard", { _token: token });
    if (error || !data) { logout(); return; }
    const d = data as any;
    setChild(d.child);
    setActivities(d.activities ?? []);
    setSubmissions(d.submissions ?? []);
    setAwards(d.awards ?? []);
    setFamilyChildren(d.family_children ?? []);
    setFamilySubs(d.family_submissions ?? []);
    setRanking(d.ranking ?? []);

    const earned = (d.submissions ?? [])
      .filter((s: any) => s.status === "aprovado")
      .reduce((sum: number, s: any) => sum + (s.reward_amount_cents ?? 0), 0);
    setBalance(earned);
    setLoading(false);
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem("jk_child_token");
    if (!token) { nav("/entrar", { replace: true }); return; }
    refresh();
  }, [nav, refresh]);

  const submit = async () => {
    if (!selected || !child) return;
    if (!file) { toast.error("Tire uma foto da prova!"); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${child.family_id}/${child.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("proofs").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("proofs").getPublicUrl(path);

      const token = localStorage.getItem("jk_child_token");
      const { data, error } = await supabase.functions.invoke("child-submit", {
        body: { token, activity_id: selected.id, photo_url: pub.publicUrl, comment: comment.trim() || null },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "Erro");

      toast.success("Enviado! Aguardando aprovação 🎉");
      setSelected(null);
      setFile(null);
      setComment("");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
    } finally {
      setBusy(false);
    }
  };

  const childName = (id: string) => familyChildren.find(c => c.id === id)?.name ?? "—";
  const actName = (id: string) => activities.find(a => a.id === id)?.name ?? "Atividade";

  // ===== Calendar derived =====
  const calendarCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startWeekday = first.getDay();
    const totalCells = Math.ceil((startWeekday + last.getDate()) / 7) * 7;

    const buckets = new Map<string, { approved: number; pending: number; refused: number }>();
    familySubs.forEach(s => {
      if (calChildFilter !== "all" && s.child_id !== calChildFilter) return;
      const d = new Date(s.completed_at);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const k = dayKey(d);
      const b = buckets.get(k) ?? { approved: 0, pending: 0, refused: 0 };
      if (s.status === "aprovado") b.approved++;
      else if (s.status === "pendente") b.pending++;
      else b.refused++;
      buckets.set(k, b);
    });

    const cells: { date: Date | null; key: string; bucket?: { approved: number; pending: number; refused: number } }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null, key: `e-${i}` });
    for (let day = 1; day <= last.getDate(); day++) {
      const date = new Date(year, month, day);
      const k = dayKey(date);
      cells.push({ date, key: k, bucket: buckets.get(k) });
    }
    while (cells.length < totalCells) cells.push({ date: null, key: `e2-${cells.length}` });
    return cells;
  }, [familySubs, cursor, calChildFilter]);

  const todayKey = dayKey(new Date());
  const dayDetails = useMemo(() => {
    if (!openDayKey) return [];
    return familySubs
      .filter(s => dayKey(new Date(s.completed_at)) === openDayKey)
      .filter(s => calChildFilter === "all" || s.child_id === calChildFilter)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  }, [openDayKey, familySubs, calChildFilter]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!child) return null;

  const statusIcon = (s: string) => s === "aprovado" ? <CheckCircle2 className="w-4 h-4 text-success" /> : s === "recusado" ? <XCircle className="w-4 h-4 text-destructive" /> : <Clock className="w-4 h-4 text-warning" />;

  const goPrev = () => { const d = new Date(cursor); d.setMonth(d.getMonth()-1); setCursor(d); };
  const goNext = () => { const d = new Date(cursor); d.setMonth(d.getMonth()+1); setCursor(d); };

  const rankMedal = (i: number) =>
    i === 0 ? <Crown className="w-5 h-5 text-accent" /> :
    i === 1 ? <Medal className="w-5 h-5 text-muted-foreground" /> :
    i === 2 ? <Medal className="w-5 h-5 text-secondary-foreground" /> :
    <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i+1}</span>;

  return (
    <div className="min-h-screen bg-gradient-hero pb-10">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-card/95 shadow-glow flex items-center justify-center">
              <Trophy className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold drop-shadow">Oi, {child.name}!</h1>
              <p className="text-xs flex items-center gap-1 opacity-90"><Sparkles className="w-3 h-3" /> Bora ganhar uma recompensa?</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-primary-foreground hover:bg-white/10">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <Card className="border-0 shadow-card rounded-3xl bg-gradient-reward text-accent-foreground">
          <CardContent className="p-5 text-center">
            <div className="text-sm opacity-80">Total ganho (aprovado)</div>
            <div className="text-4xl font-display font-bold">{formatBRL(balance)}</div>
          </CardContent>
        </Card>

        <Tabs defaultValue="atividades" className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-card/95 rounded-2xl p-1 h-auto">
            <TabsTrigger value="atividades" className="rounded-xl">Atividades</TabsTrigger>
            <TabsTrigger value="calendario" className="rounded-xl">Calendário</TabsTrigger>
            <TabsTrigger value="ranking" className="rounded-xl">Ranking</TabsTrigger>
          </TabsList>

          {/* ===== ATIVIDADES ===== */}
          <TabsContent value="atividades" className="space-y-6 mt-4">
            {!selected && (
              <Card className="border-0 shadow-card rounded-3xl">
                <CardContent className="p-5">
                  <h2 className="font-display font-bold text-xl mb-4">Escolha uma atividade</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activities.map(a => (
                      <button key={a.id} onClick={() => setSelected(a)} className="text-left p-4 rounded-2xl border-2 border-border hover:border-primary hover:shadow-soft transition-bounce bg-card">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-semibold">{a.name}</span>
                          <span className="font-display font-bold text-primary whitespace-nowrap">{formatBRL(a.reward_amount_cents)}</span>
                        </div>
                        {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                      </button>
                    ))}
                    {activities.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Nenhuma atividade disponível.</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {selected && (
              <Card className="border-0 shadow-card rounded-3xl">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Atividade escolhida</div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-bold text-xl">{selected.name}</h3>
                      <Badge className="bg-gradient-reward text-accent-foreground border-0">{formatBRL(selected.reward_amount_cents)}</Badge>
                    </div>
                  </div>

                  <label className="block">
                    <div className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-primary/40 rounded-2xl cursor-pointer hover:bg-primary/5 transition-smooth">
                      <Camera className="w-10 h-10 text-primary" />
                      <span className="text-sm font-medium">{file ? file.name : "Tirar / escolher foto da prova"}</span>
                      <span className="text-xs text-muted-foreground">A foto é obrigatória</span>
                    </div>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  </label>

                  {file && (
                    <img src={URL.createObjectURL(file)} alt="prévia" className="w-full max-h-64 object-cover rounded-2xl" />
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setSelected(null); setFile(null); }}>Cancelar</Button>
                    <Button variant="reward" className="flex-1" onClick={submit} disabled={busy || !file}>
                      {busy ? "Enviando..." : "Enviar para aprovação"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {awards.length > 0 && (
              <Card className="border-0 shadow-card rounded-3xl">
                <CardContent className="p-5">
                  <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2"><Award className="w-5 h-5 text-accent" /> Minhas medalhas</h2>
                  <div className="flex flex-wrap gap-3">
                    {awards.map(a => (
                      <div key={a.id} className="flex flex-col items-center w-20">
                        {a.medal_url ? (
                          <img src={a.medal_url} alt={a.mission_name} className="w-16 h-16 object-contain" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-warm flex items-center justify-center"><Award className="w-8 h-8 text-secondary-foreground" /></div>
                        )}
                        <div className="text-xs text-center mt-1 font-medium">{a.mission_name}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-card rounded-3xl">
              <CardContent className="p-5">
                <h2 className="font-display font-bold text-lg mb-3">Meu histórico</h2>
                {submissions.length === 0 && <p className="text-sm text-muted-foreground">Você ainda não enviou nenhuma atividade.</p>}
                <div className="space-y-2">
                  {submissions.map(h => (
                    <div key={h.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/40">
                      <div className="flex items-center gap-2 min-w-0">
                        {statusIcon(h.status)}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{actName(h.activity_id)}</div>
                          <div className="text-xs text-muted-foreground">{formatDateTime(h.completed_at)}</div>
                        </div>
                      </div>
                      <span className={`font-display font-bold whitespace-nowrap ${h.status === "aprovado" ? "text-success" : h.status === "recusado" ? "text-muted-foreground line-through" : "text-warning"}`}>
                        {formatBRL(h.reward_amount_cents)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== CALENDÁRIO ===== */}
          <TabsContent value="calendario" className="mt-4 space-y-4">
            <Card className="border-0 shadow-card rounded-3xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <h2 className="font-display font-bold text-lg capitalize">
                      {monthNames[cursor.getMonth()]} {cursor.getFullYear()}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={goPrev}><ChevronLeft className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={goNext}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  <button
                    onClick={() => setCalChildFilter("all")}
                    className={`text-xs px-3 py-1 rounded-full border transition-smooth ${calChildFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}
                  >Todos</button>
                  {familyChildren.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCalChildFilter(c.id)}
                      className={`text-xs px-3 py-1 rounded-full border transition-smooth ${calChildFilter === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}
                    >{c.name}{c.id === child.id ? " (eu)" : ""}</button>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekdays.map((w, i) => (
                    <div key={i} className="text-[10px] font-semibold text-muted-foreground text-center py-1">{w}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map(cell => {
                    if (!cell.date) return <div key={cell.key} className="aspect-square rounded-lg bg-muted/30" />;
                    const b = cell.bucket;
                    const isToday = cell.key === todayKey;
                    return (
                      <button
                        key={cell.key}
                        onClick={() => setOpenDayKey(openDayKey === cell.key ? null : cell.key)}
                        className={`aspect-square rounded-lg p-1 flex flex-col justify-between border transition-smooth hover:scale-[1.03] text-left ${
                          b ? "bg-card border-border shadow-soft" : "bg-muted/40 border-border/50"
                        } ${isToday ? "ring-2 ring-primary" : ""} ${openDayKey === cell.key ? "ring-2 ring-accent" : ""}`}
                      >
                        <div className="text-[11px] font-semibold">{cell.date.getDate()}</div>
                        <div className="flex items-center justify-center gap-0.5 flex-wrap">
                          {b?.approved ? <span className="w-1.5 h-1.5 rounded-full bg-success" /> : null}
                          {b?.pending ? <span className="w-1.5 h-1.5 rounded-full bg-warning" /> : null}
                          {b?.refused ? <span className="w-1.5 h-1.5 rounded-full bg-destructive" /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Aprovado</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Pendente</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Recusado</span>
                </div>

                {openDayKey && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <h3 className="font-display font-bold text-sm">Atividades do dia</h3>
                    {dayDetails.length === 0 && <p className="text-xs text-muted-foreground">Nada por aqui.</p>}
                    {dayDetails.map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          {statusIcon(s.status)}
                          <div className="min-w-0">
                            <div className="font-medium truncate">{actName(s.activity_id)}</div>
                            <div className="text-[10px] text-muted-foreground">{childName(s.child_id)}</div>
                          </div>
                        </div>
                        <span className={`font-display font-bold text-xs whitespace-nowrap ${s.status === "aprovado" ? "text-success" : s.status === "recusado" ? "text-muted-foreground line-through" : "text-warning"}`}>
                          {formatBRL(s.reward_amount_cents)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== RANKING ===== */}
          <TabsContent value="ranking" className="mt-4 space-y-4">
            <Card className="border-0 shadow-card rounded-3xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-accent" />
                  <h2 className="font-display font-bold text-lg">Ranking da família</h2>
                </div>
                {ranking.length === 0 && <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
                <div className="space-y-2">
                  {ranking.map((r, i) => {
                    const isMe = r.child_id === child.id;
                    return (
                      <div key={r.child_id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${isMe ? "border-primary bg-primary/5" : "border-transparent bg-muted/40"}`}>
                        <div className="w-7 flex justify-center">{rankMedal(i)}</div>
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt={r.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-warm flex items-center justify-center font-bold text-secondary-foreground">
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-bold truncate">
                            {r.name}{isMe && <span className="text-xs text-primary ml-1">(eu)</span>}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>✅ {r.approved_count} aprovadas</span>
                            {r.pending_count > 0 && <span>⏳ {r.pending_count}</span>}
                            {r.medals_count > 0 && <span className="flex items-center gap-0.5"><Award className="w-3 h-3" /> {r.medals_count}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display font-bold text-success">{formatBRL(r.earned_cents)}</div>
                          <div className="text-[10px] text-muted-foreground">ganho</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChildHome;
