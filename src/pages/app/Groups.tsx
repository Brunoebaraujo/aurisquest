import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UsersRound, Plus, Crown, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type Group = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  owner_user_id: string;
  owner_family_id: string;
};

const typeLabels: Record<string, string> = {
  familia_estendida: "Família estendida",
  escola: "Escola",
  condominio: "Condomínio",
  outro: "Outro",
};

const Groups = () => {
  const { profile, user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", type: "familia_estendida", description: "" });

  const load = async () => {
    const { data } = await supabase.from("shared_groups").select("*").order("created_at", { ascending: false });
    setGroups((data ?? []) as Group[]);
  };
  useEffect(() => { load(); }, [profile?.family_id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.family_id) return;
    if (!form.name.trim()) { toast.error("Dê um nome ao grupo"); return; }
    setBusy(true);
    const { data: g, error } = await supabase.from("shared_groups").insert({
      name: form.name.trim(),
      type: form.type as any,
      description: form.description.trim() || null,
      owner_user_id: user.id,
      owner_family_id: profile.family_id,
    }).select().single();
    if (error) { setBusy(false); toast.error(error.message); return; }
    // dono entra como membro também
    await supabase.from("shared_group_members").insert({ group_id: g!.id, family_id: profile.family_id });
    setBusy(false);
    setOpen(false);
    setForm({ name: "", type: "familia_estendida", description: "" });
    toast.success("Grupo criado!");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <UsersRound className="w-6 h-6 text-primary" /> Grupos compartilhados
          </h2>
          <p className="text-sm text-muted-foreground">Crie missões em comunidade — escolas, condomínios, família estendida.</p>
        </div>
        <Button variant="hero" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Novo grupo</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => {
          const isOwner = g.owner_user_id === user?.id;
          return (
            <Card key={g.id} className="border-0 shadow-card rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display font-bold text-lg leading-tight truncate">{g.name}</div>
                    <Badge variant="outline" className="mt-1">{typeLabels[g.type] ?? g.type}</Badge>
                  </div>
                  {isOwner && <Crown className="w-5 h-5 text-accent shrink-0" />}
                </div>
                {g.description && <p className="text-sm text-muted-foreground line-clamp-3">{g.description}</p>}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to={`/app/grupos/${g.id}`}>Abrir <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full">Nenhum grupo ainda. Crie um para conectar famílias!</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar grupo</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength={80} placeholder="Ex: Turma do 3º ano" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="familia_estendida">Família estendida</option>
                <option value="escola">Escola</option>
                <option value="condominio">Condomínio</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} maxLength={300} />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy ? "Criando..." : "Criar grupo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Groups;
