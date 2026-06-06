import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AuriIcon } from "@/components/AuriIcon";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type RewardCategory = "money" | "screen_time" | "privilege" | "experience" | "item" | "custom";

export const CATEGORY_LABELS: Record<RewardCategory, string> = {
  money: "Dinheiro",
  screen_time: "Tempo de tela",
  privilege: "Privilégio",
  experience: "Experiência",
  item: "Item",
  custom: "Personalizado",
};

export type RewardRow = {
  id: string;
  name: string;
  description: string | null;
  auris_cost: number;
  category: RewardCategory;
  active: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reward?: RewardRow | null;
  onSaved: () => void;
};

export const RewardFormDialog = ({ open, onOpenChange, reward, onSaved }: Props) => {
  const { profile, user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("10");
  const [category, setCategory] = useState<RewardCategory>("custom");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(reward?.name ?? "");
      setDescription(reward?.description ?? "");
      setCost(String(reward?.auris_cost ?? 10));
      setCategory(reward?.category ?? "custom");
      setActive(reward?.active ?? true);
    }
  }, [open, reward]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.family_id || !user) return;
    const c = parseInt(cost || "0", 10);
    if (!name.trim()) { toast.error("Informe um nome"); return; }
    if (!c || c < 1) { toast.error("Custo inválido"); return; }
    setBusy(true);
    const payload = {
      family_id: profile.family_id,
      name: name.trim(),
      description: description.trim() || null,
      auris_cost: c,
      category,
      active,
      created_by: user.id,
    };
    const res = reward
      ? await supabase.from("rewards").update(payload).eq("id", reward.id)
      : await supabase.from("rewards").insert(payload);
    setBusy(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(reward ? "Recompensa atualizada" : "Recompensa criada");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reward ? "Editar recompensa" : "Nova recompensa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={80} required placeholder="Ex: 30 min de tela" />
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 240))} rows={2} placeholder="Detalhes..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">Custo <AuriIcon size={14} /></Label>
              <Input type="number" min={1} value={cost} onChange={e => setCost(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={category}
                onChange={e => setCategory(e.target.value as RewardCategory)}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            Ativa (visível para as crianças)
          </label>
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
