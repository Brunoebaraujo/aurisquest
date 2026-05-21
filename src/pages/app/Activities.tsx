import { useEffect, useState } from "react";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TIERS, type ActivityTier, tierFromAuris } from "@/lib/tiers";
import { TierSelector } from "@/components/TierSelector";
import { TierBadge } from "@/components/TierBadge";
import { ActivityIconPicker } from "@/components/ActivityIconPicker";
import { ActivityIcon } from "@/components/ActivityIcon";
import { ACTIVITY_CATEGORIES, isActivityCategory } from "@/constants/activityCategories";

type Activity = {
  id: string; name: string; description: string | null;
  reward_auris: number; tier: ActivityTier;
  icon_key: string | null; icon_url: string | null;
  category: string | null; frequency_hint: string | null; active: boolean;
};

type FormState = {
  name: string;
  description: string;
  tier: ActivityTier;
  icon_key: string | null;
  icon_url: string | null;
  category: string;
  frequency_hint: string;
  active: boolean;
};

const empty: FormState = {
  name: "", description: "", tier: "rotina",
  icon_key: null, icon_url: null,
  category: "", frequency_hint: "diaria", active: true,
};

const Activities = () => {
  const { profile } = useAuth();
  const [list, setList] = useState<Activity[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const load = async () => {
    if (!profile?.family_id) return;
    const { data } = await supabase.from("activities").select("*").eq("family_id", profile.family_id).order("name");
    setList((data ?? []) as any);
  };
  useEffect(() => { load(); }, [profile?.family_id]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (a: Activity) => {
    setEditing(a);
    setForm({
      name: a.name, description: a.description ?? "",
      tier: (a.tier ?? tierFromAuris(a.reward_auris)) as ActivityTier,
      icon_key: a.icon_key, icon_url: a.icon_url,
      category: a.category ?? "", frequency_hint: a.frequency_hint ?? "diaria", active: a.active,
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.family_id) return;
    if (!isActivityCategory(form.category)) {
      toast.error("Selecione uma categoria válida.");
      return;
    }
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
      // reward_auris e reward_amount_cents são definidos pelo trigger no banco
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Atividades</h2>
          <p className="text-muted-foreground text-sm">Tarefas com recompensa em Auris por tier.</p>
        </div>
        <Button variant="hero" onClick={openNew}><Plus className="w-4 h-4" /> Nova atividade</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(a => (
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
                {a.frequency_hint && <Badge variant="outline">{a.frequency_hint}</Badge>}
                {!a.active && <Badge variant="destructive">inativa</Badge>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma atividade ainda.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar atividade" : "Nova atividade"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={300} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Tier de recompensa</Label>
              <TierSelector value={form.tier} onChange={t => setForm({ ...form, tier: t })} />
              <p className="text-[11px] text-muted-foreground">Vale {TIERS[form.tier].auris} Auris — valor padronizado para todas as famílias.</p>
            </div>
            <ActivityIconPicker
              familyId={profile!.family_id!}
              iconKey={form.icon_key}
              iconUrl={form.icon_url}
              onChange={(v) => setForm({ ...form, ...v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.frequency_hint} onChange={e => setForm({ ...form, frequency_hint: e.target.value })}>
                  <option value="diaria">Diária (XP 1x)</option>
                  <option value="3x_semana">3x por semana (XP 1.5x)</option>
                  <option value="semanal">Semanal (XP 2x)</option>
                  <option value="quinzenal">Quinzenal (XP 3x)</option>
                  <option value="mensal">Mensal (XP 5x)</option>
                  <option value="quest_especial">Quest especial (XP 8x)</option>
                </select>
                <p className="text-[11px] text-muted-foreground">A frequência multiplica o XP da jornada (Auris seguem o tier).</p>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={isActivityCategory(form.category) ? form.category : ""}
                  onValueChange={category => setForm({ ...form, category })}
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
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
              <Label>Ativa</Label>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
            <Button type="submit" variant="hero" className="w-full">{editing ? "Salvar" : "Criar atividade"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Activities;
