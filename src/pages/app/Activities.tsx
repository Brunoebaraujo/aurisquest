import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TIERS, type ActivityTier, tierFromAuris } from "@/lib/tiers";
import { TierSelector } from "@/components/TierSelector";
import { TierBadge } from "@/components/TierBadge";
import { ActivityIconPicker } from "@/components/ActivityIconPicker";
import { ActivityIcon } from "@/components/ActivityIcon";
import { ACTIVITY_CATEGORIES, isActivityCategory } from "@/constants/activityCategories";
import { suggestActivityCategory } from "@/lib/activityCategorySuggestion";

type Activity = {
  id: string; name: string; description: string | null;
  reward_auris: number; tier: ActivityTier;
  icon_key: string | null; icon_url: string | null;
  category: string | null; frequency_hint: string | null; active: boolean;
};

type Child = { id: string; name: string };

type FormState = {
  name: string;
  description: string;
  tier: ActivityTier;
  icon_key: string | null;
  icon_url: string | null;
  category: string;
  frequency_hint: string;
  active: boolean;
  childIds: string[];
};

const empty: FormState = {
  name: "", description: "", tier: "rotina",
  icon_key: null, icon_url: null,
  category: "Rotina", frequency_hint: "diaria", active: true,
  childIds: [],
};

const FREQUENCY_OPTIONS = [
  { value: "diaria", label: "Diária", helper: "Repete todos os dias" },
  { value: "semanal", label: "Semanal", helper: "Repete uma vez por semana" },
  { value: "mensal", label: "Mensal", helper: "Repete uma vez por mês" },
] as const;

const frequencyLabel = (value: string | null | undefined) => {
  const option = FREQUENCY_OPTIONS.find(item => item.value === value);
  if (option) return option.label;
  const legacyLabels: Record<string, string> = {
    "3x_semana": "3x por semana",
    quinzenal: "Quinzenal",
    quest_especial: "Quest especial",
  };
  return value ? legacyLabels[value] ?? value : null;
};

const Activities = () => {
  const { profile } = useAuth();
  const [list, setList] = useState<Activity[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!profile?.family_id) return;
    const [activitiesRes, childrenRes] = await Promise.all([
      supabase.from("activities").select("*").eq("family_id", profile.family_id).order("name"),
      supabase.from("children").select("id, name").eq("family_id", profile.family_id).eq("active", true).order("name"),
    ]);
    setList((activitiesRes.data ?? []) as any);
    setChildren((childrenRes.data ?? []) as Child[]);
  };
  useEffect(() => { load(); }, [profile?.family_id]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.description ?? "").toLowerCase().includes(q) ||
      (a.category ?? "").toLowerCase().includes(q),
    );
  }, [list, search]);

  const openNew = () => {
    setEditing(null);
    setCategoryTouched(false);
    setForm({ ...empty, childIds: children.map(child => child.id) });
    setOpen(true);
  };

  const openEdit = (a: Activity) => {
    setEditing(a);
    setCategoryTouched(true);
    setForm({
      name: a.name, description: a.description ?? "",
      tier: (a.tier ?? tierFromAuris(a.reward_auris)) as ActivityTier,
      icon_key: a.icon_key, icon_url: a.icon_url,
      category: a.category ?? "Rotina", frequency_hint: a.frequency_hint ?? "diaria", active: a.active,
      childIds: children.map(child => child.id),
    });
    setOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm(current => ({
      ...current,
      name,
      category: categoryTouched ? current.category : suggestActivityCategory(name),
    }));
  };

  const toggleChild = (childId: string) => {
    setForm(current => ({
      ...current,
      childIds: current.childIds.includes(childId)
        ? current.childIds.filter(id => id !== childId)
        : [...current.childIds, childId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.family_id) return;
    if (!form.name.trim()) { toast.error("Informe o nome da atividade."); return; }
    if (form.childIds.length === 0) { toast.error("Selecione ao menos uma criança."); return; }
    if (!isActivityCategory(form.category)) { toast.error("Selecione uma categoria válida."); return; }
    const payload = {
      family_id: profile.family_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      tier: form.tier,
      icon_key: form.icon_key,
      icon_url: form.icon_url,
      category: form.category,
      frequency_hint: form.frequency_hint || null,
      active: form.active,
    };
    const { error } = editing
      ? await supabase.from("activities").update(payload).eq("id", editing.id)
      : await supabase.from("activities").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Atividade atualizada" : "Atividade criada"); setOpen(false); load(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apagar esta atividade?")) return;
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Apagada"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Atividades</h2>
          <p className="text-muted-foreground text-sm">Gerencie atividades da família e crie rotinas personalizadas para as crianças.</p>
        </div>
        <div className="w-full rounded-2xl border bg-card p-4 shadow-card lg:max-w-md">
          <p className="text-sm text-muted-foreground mb-3">
            Crie atividades específicas para sua criança, como lavar as mãos, guardar brinquedos ou comportamento exemplar.
          </p>
          <Button variant="hero" onClick={openNew} className="w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Criar atividade personalizada
          </Button>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar atividade por nome, descrição ou categoria"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.map(a => (
          <Card key={a.id} className={`border-0 shadow-card rounded-2xl ${!a.active ? "opacity-60" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-2">
                <ActivityIcon iconKey={a.icon_key} iconUrl={a.icon_url} size={48} framed />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg leading-tight">{a.name}</h3>
                  <TierBadge tier={(a.tier ?? tierFromAuris(a.reward_auris)) as ActivityTier} size="sm" />
                </div>
              </div>
              {a.description && <p className="text-sm text-muted-foreground mb-3">{a.description}</p>}
              <div className="flex flex-wrap gap-1 mb-3">
                {a.category && <Badge variant="secondary">{a.category}</Badge>}
                {frequencyLabel(a.frequency_hint) && <Badge variant="outline">{frequencyLabel(a.frequency_hint)}</Badge>}
                {!a.active && <Badge variant="destructive">inativa</Badge>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredList.length === 0 && (
          <Card className="border-0 shadow-card rounded-2xl md:col-span-2 lg:col-span-3">
            <CardContent className="p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">Não encontrou o que procura?</h3>
                <p className="text-sm text-muted-foreground">Crie uma atividade personalizada para sua criança.</p>
              </div>
              <Button variant="hero" onClick={openNew}>
                <Plus className="w-4 h-4" /> Criar atividade personalizada
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar atividade" : "Criar atividade personalizada"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da atividade</Label>
              <Input value={form.name} onChange={e => handleNameChange(e.target.value)} required maxLength={80} placeholder="Ex: Lavar as mãos" />
            </div>
            <div className="space-y-2">
              <Label>Criança(s)</Label>
              <div className="space-y-2 rounded-xl border p-3">
                {children.length === 0 && <p className="text-sm text-muted-foreground">Cadastre uma criança para criar atividades.</p>}
                {children.map(child => (
                  <label key={child.id} className="flex cursor-pointer items-center gap-2">
                    <Checkbox checked={form.childIds.includes(child.id)} onCheckedChange={() => toggleChild(child.id)} />
                    <span className="text-sm">{child.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">A atividade fica disponível na família conforme as regras atuais do app.</p>
            </div>
            <div className="space-y-2">
              <Label>Frequência</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {FREQUENCY_OPTIONS.map(option => {
                  const selected = form.frequency_hint === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm({ ...form, frequency_hint: option.value })}
                      className={`rounded-xl border-2 p-3 text-left transition-bounce ${selected ? "border-primary bg-primary/10 shadow-soft" : "border-border bg-card hover:border-muted-foreground/40"}`}
                    >
                      <div className="font-semibold">{option.label}</div>
                      <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{option.helper}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Recompensa</Label>
              <TierSelector value={form.tier} onChange={t => setForm({ ...form, tier: t })} />
              <p className="text-[11px] text-muted-foreground">Sugestão atual: {TIERS[form.tier].auris} Auris.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoria (opcional)</Label>
                <Select
                  value={isActivityCategory(form.category) ? form.category : "Rotina"}
                  onValueChange={category => { setCategoryTouched(true); setForm({ ...form, category }); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!categoryTouched && form.name.trim() && (
                  <p className="text-[11px] text-muted-foreground">Categoria sugerida automaticamente pelo nome.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={300} rows={3} />
              </div>
            </div>
            <ActivityIconPicker
              familyId={profile!.family_id!}
              iconKey={form.icon_key}
              iconUrl={form.icon_url}
              onChange={(v) => setForm({ ...form, ...v })}
            />
            <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
              <Label>Ativa</Label>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={children.length === 0}>
              {editing ? "Salvar" : "Criar atividade"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Activities;
