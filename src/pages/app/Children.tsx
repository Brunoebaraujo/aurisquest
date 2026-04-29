import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Copy, ExternalLink, User as UserIcon, Award } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type Child = { id: string; name: string; avatar_url: string | null; active: boolean };

const Children = () => {
  const { profile } = useAuth();
  const [list, setList] = useState<Child[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!profile?.family_id) return;
    const { data } = await supabase.from("children").select("*").eq("family_id", profile.family_id).order("created_at", { ascending: true });
    setList((data ?? []) as Child[]);
  };

  useEffect(() => { load(); }, [profile?.family_id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.family_id || !name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("children").insert({ family_id: profile.family_id, name: name.trim(), active: true });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Criança adicionada!"); setName(""); setOpen(false); load(); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("children").update({ active }).eq("id", id);
    load();
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/enviar/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado! Envie para a criança.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Crianças</h2>
          <p className="text-muted-foreground text-sm">Gerencie quem participa.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero"><Plus className="w-4 h-4" /> Nova criança</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar criança</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cname">Nome</Label>
                <Input id="cname" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Lucas" required maxLength={60} />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={busy}>{busy ? "Salvando..." : "Adicionar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(c => (
          <Card key={c.id} className="border-0 shadow-card rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.active ? "Ativa" : "Inativa"}</div>
                </div>
                <Switch checked={c.active} onCheckedChange={(v) => toggleActive(c.id, v)} />
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/app/criancas/${c.id}`}><Award className="w-4 h-4" /> Ver perfil e medalhas</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => copyLink(c.id)}>
                  <Copy className="w-4 h-4" /> Copiar link da criança
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/enviar/${c.id}`} target="_blank"><ExternalLink className="w-4 h-4" /> Abrir tela da criança</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma criança ainda.</p>}
      </div>

      <Card className="border-0 shadow-soft rounded-2xl bg-muted/40">
        <CardContent className="p-4 text-sm text-muted-foreground">
          💡 <strong>Como a criança envia uma atividade?</strong> Por enquanto, copie o link da criança e abra em um celular/tablet — ela escolhe a atividade, tira a foto e envia. Você aprova em <Link to="/app/pendencias" className="underline text-primary">Pendências</Link>. Em breve: login próprio com usuário e senha.
        </CardContent>
      </Card>
    </div>
  );
};

export default Children;
