import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Gift, Plus, Pencil, Search, Upload, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ---------- Types ----------
type Rarity = "comum" | "raro" | "epico" | "lendario";
type ScopeType = "global" | "group" | "family" | "child";
type UnlockRule =
  | "starter" | "manual" | "auris_total" | "medalhas" | "streak"
  | "aprovacoes" | "atividade" | "categoria" | "missao_grupo";
type RewardKind = "avatar" | "elmo" | "armadura" | "arma" | "pet" | "aura" | "moldura" | "badge";

type RewardRow = {
  kind: "avatar" | "item";       // origin table
  id: string;
  name: string;
  description: string | null;
  category: RewardKind;          // for avatar: "avatar"
  image_url: string;
  rarity: Rarity;
  active: boolean;
  sort_order: number;
  unlock_rule_type: UnlockRule;
  unlock_threshold: number;
  unlock_condition_value: Record<string, unknown> | null;
  scope_type: ScopeType;
  scope_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

const RARITIES: Rarity[] = ["comum", "raro", "epico", "lendario"];
const RARITY_LABEL: Record<Rarity, string> = { comum: "Comum", raro: "Raro", epico: "Épico", lendario: "Lendário" };
const RARITY_COLOR: Record<Rarity, string> = {
  comum: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  raro: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  epico: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  lendario: "bg-amber-500/15 text-amber-700 border-amber-500/30",
};

const KINDS: { value: RewardKind; label: string }[] = [
  { value: "avatar", label: "Avatar" },
  { value: "elmo", label: "Elmo" },
  { value: "armadura", label: "Armadura" },
  { value: "arma", label: "Arma/Ferramenta" },
  { value: "pet", label: "Pet" },
  { value: "aura", label: "Aura" },
  { value: "moldura", label: "Moldura" },
  { value: "badge", label: "Badge" },
];

const RULES: { value: UnlockRule; label: string; help: string }[] = [
  { value: "starter", label: "Starter (todos recebem)", help: "Desbloqueio automático para toda criança." },
  { value: "manual", label: "Desbloqueio manual", help: "Só desbloqueia quando admin conceder." },
  { value: "auris_total", label: "Acumular Auris", help: "Quando soma de auris aprovados ≥ valor." },
  { value: "medalhas", label: "Acumular medalhas", help: "Quando nº de medalhas ≥ valor." },
  { value: "streak", label: "Dias seguidos (streak)", help: "Quando melhor streak ≥ valor." },
  { value: "aprovacoes", label: "Nº de aprovações", help: "Quando aprovações totais ≥ valor. (avaliação futura)" },
  { value: "atividade", label: "Atividade específica", help: "Concluir atividade X vezes. (avaliação futura)" },
  { value: "categoria", label: "Atividades por categoria", help: "X atividades de uma categoria. (avaliação futura)" },
  { value: "missao_grupo", label: "Missão de grupo", help: "Concluir missão em grupo. (avaliação futura)" },
];

const SCOPES: { value: ScopeType; label: string }[] = [
  { value: "global", label: "Global" },
  { value: "group", label: "Grupo específico" },
  { value: "family", label: "Família específica" },
  { value: "child", label: "Criança específica" },
];

// ---------- Component ----------
const AdminRewards = () => {
  const { isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<RewardRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState<RewardKind | "todos">("todos");
  const [filterRarity, setFilterRarity] = useState<Rarity | "todas">("todas");
  const [filterStatus, setFilterStatus] = useState<"todos" | "ativos" | "inativos">("todos");
  const [editing, setEditing] = useState<RewardRow | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setBusy(true);
    const [{ data: avs, error: ea }, { data: its, error: ei }] = await Promise.all([
      supabase.from("avatars").select("*").order("sort_order"),
      supabase.from("cosmetic_items").select("*").order("category").order("sort_order"),
    ]);
    if (ea || ei) toast.error("Erro ao carregar recompensas");
    const list: RewardRow[] = [
      ...((avs ?? []) as any[]).map(a => ({
        kind: "avatar" as const, id: a.id, name: a.name, description: a.description ?? null,
        category: "avatar" as RewardKind, image_url: a.image_url, rarity: a.rarity, active: a.active,
        sort_order: a.sort_order, unlock_rule_type: a.unlock_rule_type, unlock_threshold: a.unlock_threshold,
        unlock_condition_value: a.unlock_condition_value ?? null,
        scope_type: a.scope_type ?? "global", scope_id: a.scope_id ?? null,
        starts_at: a.starts_at, ends_at: a.ends_at,
      })),
      ...((its ?? []) as any[]).map(i => ({
        kind: "item" as const, id: i.id, name: i.name, description: i.description ?? null,
        category: i.category as RewardKind, image_url: i.image_url, rarity: i.rarity, active: i.active,
        sort_order: i.sort_order, unlock_rule_type: i.unlock_rule_type, unlock_threshold: i.unlock_threshold,
        unlock_condition_value: i.unlock_condition_value ?? null,
        scope_type: i.scope_type ?? "global", scope_id: i.scope_id ?? null,
        starts_at: i.starts_at, ends_at: i.ends_at,
      })),
    ];
    setRows(list);
    setBusy(false);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterKind !== "todos" && r.category !== filterKind) return false;
      if (filterRarity !== "todas" && r.rarity !== filterRarity) return false;
      if (filterStatus === "ativos" && !r.active) return false;
      if (filterStatus === "inativos" && r.active) return false;
      if (search.trim() && !r.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [rows, filterKind, filterRarity, filterStatus, search]);

  const toggleActive = async (r: RewardRow) => {
    const table = r.kind === "avatar" ? "avatars" : "cosmetic_items";
    const { error } = await supabase.from(table).update({ active: !r.active }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(r.active ? "Recompensa desativada" : "Recompensa ativada");
    load();
  };

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (r: RewardRow) => { setEditing(r); setOpen(true); };

  if (loading) return <div className="p-6">Carregando…</div>;
  if (!isAdmin) return <Navigate to="/app" replace />;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft">
            <Gift className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl">Recompensas</h1>
            <p className="text-sm text-muted-foreground">Catálogo global de avatares, itens e desbloqueáveis.</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Nova recompensa</Button>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por nome…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterKind} onValueChange={(v) => setFilterKind(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {KINDS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterRarity} onValueChange={(v) => setFilterRarity(v as any)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas raridades</SelectItem>
                {RARITIES.map(r => <SelectItem key={r} value={r}>{RARITY_LABEL[r]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <TabsList>
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="ativos">Ativos</TabsTrigger>
                <TabsTrigger value="inativos">Inativos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {busy ? (
            <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">Nenhuma recompensa encontrada.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map(r => (
                <div key={`${r.kind}-${r.id}`} className={`group rounded-2xl border bg-card overflow-hidden shadow-soft transition hover:shadow-card ${!r.active ? "opacity-60" : ""}`}>
                  <div className="aspect-square bg-gradient-to-br from-muted/50 to-background flex items-center justify-center p-2 relative">
                    <img src={r.image_url} alt={r.name} className="w-full h-full object-contain" />
                    <Badge variant="outline" className={`absolute top-2 left-2 text-[10px] ${RARITY_COLOR[r.rarity]}`}>{RARITY_LABEL[r.rarity]}</Badge>
                    {!r.active && <Badge variant="outline" className="absolute top-2 right-2 text-[10px] bg-background/80">inativo</Badge>}
                  </div>
                  <div className="p-3 space-y-2">
                    <div>
                      <div className="font-semibold text-sm truncate">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{r.category} · {r.unlock_rule_type}</div>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => openEdit(r)}>
                        <Pencil className="w-3 h-3" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => toggleActive(r)}>
                        {r.active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {r.active ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RewardFormDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}
        editing={editing}
        onSaved={() => { setOpen(false); setEditing(null); load(); }}
      />
    </div>
  );
};

// ---------- Form Dialog ----------
function RewardFormDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: RewardRow | null;
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<RewardKind>("pet");
  const [rarity, setRarity] = useState<Rarity>("comum");
  const [active, setActive] = useState(true);
  const [rule, setRule] = useState<UnlockRule>("manual");
  const [threshold, setThreshold] = useState<number>(0);
  const [conditionValueText, setConditionValueText] = useState<string>("");
  const [scopeType, setScopeType] = useState<ScopeType>("global");
  const [scopeId, setScopeId] = useState<string>("");
  const [startsAt, setStartsAt] = useState<string>("");
  const [endsAt, setEndsAt] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setKind(editing.category);
      setRarity(editing.rarity);
      setActive(editing.active);
      setRule(editing.unlock_rule_type);
      setThreshold(editing.unlock_threshold);
      setConditionValueText(editing.unlock_condition_value && Object.keys(editing.unlock_condition_value).length
        ? JSON.stringify(editing.unlock_condition_value) : "");
      setScopeType(editing.scope_type);
      setScopeId(editing.scope_id ?? "");
      setStartsAt(editing.starts_at ? editing.starts_at.slice(0, 16) : "");
      setEndsAt(editing.ends_at ? editing.ends_at.slice(0, 16) : "");
      setImageUrl(editing.image_url);
    } else {
      setName(""); setDescription(""); setKind("pet"); setRarity("comum");
      setActive(true); setRule("manual"); setThreshold(0); setConditionValueText("");
      setScopeType("global"); setScopeId(""); setStartsAt(""); setEndsAt(""); setImageUrl("");
    }
  }, [editing, open]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const safeName = (name || "reward").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
      const path = `${kind}/${safeName}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("cosmetics").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("cosmetics").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    if (!imageUrl) { toast.error("Imagem obrigatória"); return; }
    if (scopeType !== "global" && !scopeId.trim()) { toast.error("Informe o ID do escopo"); return; }

    let conditionValue: any = {};
    if (conditionValueText.trim()) {
      try { conditionValue = JSON.parse(conditionValueText); }
      catch { toast.error("Condição (JSON) inválida"); return; }
    }

    setSaving(true);
    const payload: any = {
      name: name.trim(),
      description: description.trim() || null,
      image_url: imageUrl,
      rarity,
      active,
      unlock_rule_type: rule,
      unlock_threshold: Number(threshold) || 0,
      unlock_condition_value: conditionValue,
      scope_type: scopeType,
      scope_id: scopeType === "global" ? null : scopeId.trim(),
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    };

    let error: any = null;
    if (isEdit && editing) {
      const table = editing.kind === "avatar" ? "avatars" : "cosmetic_items";
      const updatePayload = editing.kind === "avatar" ? payload : { ...payload, category: kind };
      const res = await supabase.from(table).update(updatePayload).eq("id", editing.id);
      error = res.error;
    } else {
      if (kind === "avatar") {
        const res = await supabase.from("avatars").insert({ ...payload, category: "humano" });
        error = res.error;
      } else {
        const res = await supabase.from("cosmetic_items").insert({ ...payload, category: kind });
        error = res.error;
      }
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? "Recompensa atualizada" : "Recompensa criada");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar recompensa" : "Nova recompensa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image */}
          <div className="flex items-start gap-4">
            <div className="w-28 h-28 rounded-xl bg-muted border overflow-hidden flex items-center justify-center shrink-0">
              {imageUrl
                ? <img src={imageUrl} alt="preview" className="w-full h-full object-contain" />
                : <Gift className="w-8 h-8 text-muted-foreground" />}
            </div>
            <div className="flex-1 space-y-2">
              <Label>Imagem da recompensa *</Label>
              <Input
                type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                disabled={uploading}
              />
              {uploading && <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Enviando…</div>}
              <p className="text-xs text-muted-foreground">PNG/JPG/WebP/SVG. Quadrado, fundo transparente recomendado.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Tigre-sabre" />
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>

            <div>
              <Label>Tipo *</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as RewardKind)} disabled={isEdit && editing?.kind === "avatar"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {isEdit && <p className="text-[11px] text-muted-foreground mt-1">Tipo não pode mudar entre avatar e item.</p>}
            </div>
            <div>
              <Label>Raridade *</Label>
              <Select value={rarity} onValueChange={(v) => setRarity(v as Rarity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RARITIES.map(r => <SelectItem key={r} value={r}>{RARITY_LABEL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Condição de desbloqueio *</Label>
              <Select value={rule} onValueChange={(v) => setRule(v as UnlockRule)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RULES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">{RULES.find(r => r.value === rule)?.help}</p>
            </div>
            <div>
              <Label>Valor da condição</Label>
              <Input type="number" min={0} value={threshold} onChange={e => setThreshold(Number(e.target.value))}
                disabled={rule === "starter" || rule === "manual"} />
            </div>

            {(rule === "atividade" || rule === "categoria" || rule === "missao_grupo") && (
              <div className="col-span-2">
                <Label>Parâmetros extras (JSON)</Label>
                <Input value={conditionValueText} onChange={e => setConditionValueText(e.target.value)}
                  placeholder={rule === "atividade" ? '{"activity_id":"..."}' : rule === "categoria" ? '{"category":"saude"}' : '{"shared_mission_id":"..."}'} />
                <p className="text-[11px] text-muted-foreground mt-1">A avaliação automática destas condições será habilitada em entrega futura; por enquanto servem como configuração.</p>
              </div>
            )}

            <div>
              <Label>Escopo *</Label>
              <Select value={scopeType} onValueChange={(v) => setScopeType(v as ScopeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ID do escopo {scopeType !== "global" && "*"}</Label>
              <Input value={scopeId} onChange={e => setScopeId(e.target.value)} placeholder={scopeType === "global" ? "—" : "UUID"} disabled={scopeType === "global"} />
            </div>

            <div>
              <Label>Início</Label>
              <Input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
            </div>

            <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Recompensa ativa</Label>
                <p className="text-xs text-muted-foreground">Apenas recompensas ativas podem ser desbloqueadas.</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || uploading} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Salvar alterações" : "Criar recompensa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AdminRewards;
