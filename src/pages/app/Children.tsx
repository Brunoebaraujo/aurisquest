import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, User as UserIcon, Award, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type Child = { id: string; name: string; avatar_url: string | null; active: boolean; password_set_at: string | null };

const Children = () => {
  const { profile } = useAuth();
  const [list, setList] = useState<Child[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // password dialog
  const [pwdChild, setPwdChild] = useState<Child | null>(null);
  const [pwd, setPwd] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  const load = async () => {
    if (!profile?.family_id) return;
    const { data } = await supabase.from("children")
      .select("id, name, avatar_url, active, password_set_at")
      .eq("family_id", profile.family_id)
      .order("created_at", { ascending: true });
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

  const setPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdChild) return;
    if (pwd.length < 4) { toast.error("Senha precisa ter ao menos 4 caracteres"); return; }
    setPwdBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("child-set-password", {
        body: { child_id: pwdChild.id, password: pwd },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message);
      toast.success(`Senha definida para ${pwdChild.name}!`);
      setPwd("");
      setPwdChild(null);
      load();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setPwdBusy(false);
    }
  };

  const loginUrl = `${window.location.origin}/entrar`;

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

      <Card className="border-0 shadow-soft rounded-2xl bg-primary/5">
        <CardContent className="p-4 text-sm space-y-2">
          <div className="font-semibold flex items-center gap-2">🔗 Link único para todas as crianças</div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="bg-card px-3 py-1.5 rounded-lg text-xs break-all flex-1 min-w-[200px]">{loginUrl}</code>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(loginUrl); toast.success("Link copiado!"); }}>Copiar</Button>
          </div>
          <p className="text-muted-foreground text-xs">Cada criança escolhe seu nome e digita a senha que você definiu abaixo.</p>
        </CardContent>
      </Card>

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

              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${c.password_set_at ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                {c.password_set_at ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{c.password_set_at ? "Senha definida" : "Sem senha — não consegue entrar"}</span>
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={() => { setPwdChild(c); setPwd(""); }}>
                  <KeyRound className="w-4 h-4" /> {c.password_set_at ? "Trocar senha" : "Definir senha"}
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/app/criancas/${c.id}`}><Award className="w-4 h-4" /> Ver perfil e medalhas</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma criança ainda.</p>}
      </div>

      <Dialog open={!!pwdChild} onOpenChange={(o) => !o && setPwdChild(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pwdChild?.password_set_at ? "Trocar" : "Definir"} senha — {pwdChild?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={setPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pwd">Senha (mínimo 4 caracteres)</Label>
              <Input id="pwd" type="text" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Ex: 1234 ou abelha" autoFocus minLength={4} maxLength={72} required />
              <p className="text-xs text-muted-foreground">Combine algo simples com a criança. Ao trocar, qualquer sessão antiga é desconectada.</p>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={pwdBusy}>
              {pwdBusy ? "Salvando..." : "Salvar senha"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Children;
