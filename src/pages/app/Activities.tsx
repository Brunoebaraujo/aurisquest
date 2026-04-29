import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";

type Activity = {
  id: string; name: string; description: string | null;
  reward_amount_cents: number; category: string | null;
  frequency_hint: string | null; active: boolean;
};

const empty = { name: "", description: "", reward_reais: "0,50", category: "", frequency_hint: "diaria", active: true };

const Activities = () => {
  const { profile } = useAuth();
  const [list, setList] = useState<Activity[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    if (!profile?.family_id) return;
    const { data } = await supabase.from("activities").select("*").eq("family_id", profile.family_id).order("name");
    setList((data ?? []) as Activity[]);
  };
  useEffect(() => { load(); }, [profile?.family_id]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (a: Activity) => {
    setEditing(a);
    setForm({
      name: a.name,
      description: a.description ?? "",
      reward_reais: (a.reward_amount_cents / 100).toFixed(2).replace(".", ","),
      category: a.category ?? "",
      frequency_hint: a.frequency_hint ?? "diaria",
      active: a.active,
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.family_id) return;
    const cents = Math.round(parseFloat(form.reward_reais.replace(",", ".")) * 100);
    if (isNaN(cents) || cents < 0) { toast.error("Valor inválido"); return; }
    const payload = {
      family_id: profile.family_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      reward_amount_cents: cents,
      category: form.category.trim() || null,
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Atividades</h2>
          <p className="text-muted-foreground text-sm">Tarefas com recompensa que as crianças podem realizar.</p>
        </div>
        <Button variant="hero" onClick={openNew}><Plus className="w-4 h-4" /> Nova atividade</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(a => (
          <Card key={a.id} className={`border-0 shadow-card rounded-2xl ${!a.active ? "opacity-60" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-lg leading-tight">{a.name}</h3>
                <span className="font-display font-bold text-primary text-lg whitespace-nowrap">{formatBRL(a.reward_amount_cents)}</span>
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar atividade" : "Nova atividade"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={300} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Recompensa (R$)</Label>
                <Input value={form.reward_reais} onChange={e => setForm({ ...form, reward_reais: e.target.value })} placeholder="0,50" />
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.frequency_hint} onChange={e => setForm({ ...form, frequency_hint: e.target.value })}>
                  <option value="diaria">Diária</option>
                  <option value="semanal">Semanal</option>
                  <option value="ocasional">Ocasional</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: Higiene" maxLength={40} />
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
