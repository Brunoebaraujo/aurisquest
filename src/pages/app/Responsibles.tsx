import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Users, Plus, Copy, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Profile = { id: string; full_name: string | null; email: string | null };
type Invitation = {
  id: string; token: string; parent_name: string; contact: string;
  status: string; created_at: string; expires_at: string; kind: string;
};

const Responsibles = () => {
  const { profile, loading } = useAuth();
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const load = async () => {
    if (!profile?.family_id) return;
    const [{ data: fam }, { data: profs }, { data: invs }] = await Promise.all([
      supabase.from("families").select("primary_parent_id").eq("id", profile.family_id).maybeSingle(),
      supabase.from("profiles").select("id,full_name,email").eq("family_id", profile.family_id),
      supabase.from("invitations").select("*").eq("family_id", profile.family_id).eq("kind", "family_responsible").order("created_at", { ascending: false }),
    ]);
    setPrimaryId(fam?.primary_parent_id ?? null);
    setMembers((profs ?? []) as Profile[]);
    setInvites((invs ?? []) as Invitation[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.family_id]);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!profile?.family_id) return <Navigate to="/app" replace />;

  const inviteUrl = (token: string) => `${window.location.origin}/convite/${token}`;
  const copy = async (url: string) => { await navigator.clipboard.writeText(url); toast.success("Link copiado!"); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || contact.trim().length < 3) { toast.error("Preencha nome e contato"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("create_responsible_invitation", { _name: name, _contact: contact });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const token = (data as any)?.token;
    if (token) { setLastUrl(inviteUrl(token)); await copy(inviteUrl(token)); }
    setName(""); setContact("");
    toast.success("Convite criado e link copiado!");
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("invitations").update({ status: "cancelado" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Convite cancelado"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Responsáveis</h1>
            <p className="text-sm text-muted-foreground">Gerencie quem cuida desta família com você</p>
          </div>
        </div>
        <Button onClick={() => { setOpen(true); setLastUrl(null); }}><Plus className="w-4 h-4 mr-1" />Convidar responsável</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Membros atuais</CardTitle></CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum responsável ainda.</p>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {m.full_name || "—"}
                      {m.id === primaryId && <Badge className="gap-1 bg-amber-100 text-amber-800"><Crown className="w-3 h-3" />Principal</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Convites</CardTitle></CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum convite.</p>
          ) : (
            <div className="space-y-2">
              {invites.map(inv => {
                const expired = new Date(inv.expires_at) <= new Date() && inv.status === "pendente";
                const status = expired ? "expirado" : inv.status;
                return (
                  <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="font-medium">{inv.parent_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{inv.contact} · {status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inv.status === "pendente" && !expired && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => copy(inviteUrl(inv.token))}><Copy className="w-3 h-3 mr-1" />Copiar link</Button>
                          <Button size="sm" variant="ghost" onClick={() => cancel(inv.id)}>Cancelar</Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar responsável</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rname">Nome</Label>
              <Input id="rname" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: João" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rcontact">Email</Label>
              <Input id="rcontact" value={contact} onChange={e => setContact(e.target.value)} placeholder="joao@email.com" />
            </div>
            {lastUrl && (
              <div className="rounded-lg bg-muted p-3 text-sm space-y-2">
                <div className="font-medium">Link gerado:</div>
                <div className="break-all text-xs">{lastUrl}</div>
                <Button type="button" size="sm" onClick={() => copy(lastUrl)}><Copy className="w-3 h-3 mr-1" />Copiar</Button>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
              <Button type="submit" disabled={busy}>{busy ? "Criando..." : "Criar convite"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Responsibles;
