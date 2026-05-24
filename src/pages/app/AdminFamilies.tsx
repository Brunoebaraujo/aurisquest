import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, Plus, Copy, X, RefreshCw, Clock, CheckCircle2, XCircle, Trash2, UserRound, Baby } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

type Family = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  primary_parent_id: string | null;
  slug: string | null;
};
type Invitation = {
  id: string;
  family_id: string;
  token: string;
  parent_name: string;
  contact: string;
  status: string;
  created_at: string;
  expires_at: string;
};

const schema = z.object({
  family_name: z.string().trim().min(2, "Nome muito curto").max(80),
  parent_name: z.string().trim().min(2, "Nome muito curto").max(80),
  contact: z.string().trim().min(3, "Informe email ou telefone").max(120),
});

const genToken = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, c => ({ "+": "-", "/": "_", "=": "" }[c]!));
};

const AdminFamilies = () => {
  const { user, isAdmin, loading } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [parents, setParents] = useState<Record<string, { full_name: string | null; email: string | null }>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [parentName, setParentName] = useState("");
  const [contact, setContact] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const load = async () => {
    const [{ data: fams }, { data: invs }] = await Promise.all([
      supabase.from("families").select("id,name,status,created_at,primary_parent_id,slug").order("created_at", { ascending: false }),
      supabase.from("invitations").select("*").order("created_at", { ascending: false }),
    ]);
    setFamilies((fams ?? []) as Family[]);
    setInvites((invs ?? []) as Invitation[]);

    const ids = Array.from(new Set((fams ?? []).map(f => f.primary_parent_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      const map: typeof parents = {};
      (profs ?? []).forEach(p => { map[p.id] = { full_name: p.full_name, email: p.email }; });
      setParents(map);
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!isAdmin) return <Navigate to="/app" replace />;

  const inviteUrl = (token: string) => `${window.location.origin}/convite/${token}`;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ family_name: familyName, parent_name: parentName, contact });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    if (!user) return;
    setBusy(true);

    // 1. cria família pendente
    const { data: fam, error: famErr } = await supabase
      .from("families")
      .insert({ name: parsed.data.family_name, created_by: user.id, status: "pendente" })
      .select()
      .single();
    if (famErr || !fam) { setBusy(false); toast.error("Erro: " + famErr?.message); return; }

    // 2. cria convite
    const token = genToken();
    const { error: invErr } = await supabase.from("invitations").insert({
      family_id: fam.id,
      token,
      parent_name: parsed.data.parent_name,
      contact: parsed.data.contact,
      created_by: user.id,
    });
    if (invErr) { setBusy(false); toast.error("Erro no convite: " + invErr.message); return; }

    setBusy(false);
    setLastInviteUrl(inviteUrl(token));
    setFamilyName(""); setParentName(""); setContact("");
    toast.success("Família criada e convite gerado!");
    load();
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const cancelInvite = async (id: string) => {
    const { error } = await supabase.from("invitations").update({ status: "cancelado" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Convite cancelado"); load(); }
  };

  const resendInvite = async (inv: Invitation) => {
    // gera novo token e estende prazo
    const token = genToken();
    const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("invitations")
      .update({ token, status: "pendente", expires_at: newExpires, accepted_at: null, accepted_by: null })
      .eq("id", inv.id);
    if (error) { toast.error(error.message); return; }
    await copyLink(inviteUrl(token));
    toast.success("Convite renovado e link copiado!");
    load();
  };

  const guardianInviteFor = (familyId: string) => {
    // pega o convite mais recente, válido e pendente, do tipo onboarding
    return invites.find(i => i.family_id === familyId && i.status === "pendente" && new Date(i.expires_at) > new Date());
  };

  const copyGuardianLink = async (fam: Family) => {
    const inv = guardianInviteFor(fam.id);
    if (inv) {
      await copyLink(inviteUrl(inv.token));
      toast.success("Link do responsável copiado");
      return;
    }
    if (fam.status === "ativa") {
      await copyLink(`${window.location.origin}/auth`);
      toast.success("Link de acesso do responsável copiado");
      return;
    }
    toast.error("Sem convite válido. Renove o convite primeiro.");
  };

  const deleteFamily = async (fam: Family) => {
    const { error } = await supabase.rpc("admin_delete_pending_family", { _family_id: fam.id });
    if (error) {
      const map: Record<string, string> = {
        family_not_pending: "Só é possível excluir famílias pendentes.",
        family_has_children: "A família já tem crianças cadastradas.",
        family_has_users: "A família já tem responsáveis vinculados.",
        family_has_activity: "A família já possui registros.",
      };
      const key = (error.message || "").split(":").pop()?.trim() || "";
      toast.error(map[key] || error.message);
      return;
    }
    toast.success("Família excluída");
    load();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string; icon: any }> = {
      ativa: { label: "Ativa", cls: "bg-green-100 text-green-800", icon: CheckCircle2 },
      pendente: { label: "Pendente", cls: "bg-yellow-100 text-yellow-800", icon: Clock },
      aceito: { label: "Aceito", cls: "bg-green-100 text-green-800", icon: CheckCircle2 },
      cancelado: { label: "Cancelado", cls: "bg-muted text-muted-foreground", icon: XCircle },
      expirado: { label: "Expirado", cls: "bg-red-100 text-red-800", icon: XCircle },
    };
    const v = map[s] ?? { label: s, cls: "bg-muted", icon: Clock };
    const Icon = v.icon;
    return <Badge className={v.cls + " gap-1 font-medium"}><Icon className="w-3 h-3" />{v.label}</Badge>;
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Famílias</h1>
            <p className="text-sm text-muted-foreground">Gestão administrativa de famílias e convites</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Nova família</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Famílias cadastradas</CardTitle></CardHeader>
        <CardContent>
          {families.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma família ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Família</th>
                    <th>Responsável</th>
                    <th>Status</th>
                    <th>Criada em</th>
                    <th>Links de acesso</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {families.map(f => {
                    const p = f.primary_parent_id ? parents[f.primary_parent_id] : null;
                    const kidUrl = f.slug || f.kid_access_token
                      ? `${window.location.origin}/familia/${f.slug || f.kid_access_token}/entrar`
                      : null;
                    const canDelete = f.status === "pendente";
                    const hasGuardianTarget = !!guardianInviteFor(f.id) || f.status === "ativa";
                    return (
                      <tr key={f.id} className="border-t align-middle">
                        <td className="py-2 font-medium">{f.name}</td>
                        <td>{p ? (p.full_name || p.email || "—") : <span className="text-muted-foreground">—</span>}</td>
                        <td>{statusBadge(f.status)}</td>
                        <td className="text-muted-foreground">{fmtDate(f.created_at)}</td>
                        <td>
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!hasGuardianTarget}
                              onClick={() => copyGuardianLink(f)}
                              title={hasGuardianTarget ? "Copiar link do responsável" : "Sem convite válido"}
                            >
                              <UserRound className="w-3 h-3 mr-1" />Responsável
                            </Button>
                            {kidUrl ? (
                              <Button size="sm" variant="outline" onClick={() => { copyLink(kidUrl); }}>
                                <Baby className="w-3 h-3 mr-1" />Crianças
                              </Button>
                            ) : <span className="text-muted-foreground self-center">—</span>}
                          </div>
                        </td>
                        <td className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canDelete}
                                title={canDelete ? "Excluir família pendente" : "Só famílias pendentes podem ser excluídas"}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir família "{f.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Essa ação não pode ser desfeita. Os convites pendentes desta família também serão removidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteFamily(f)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Convites</CardTitle></CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum convite gerado ainda.</p>
          ) : (
            <div className="space-y-2">
              {invites.map(inv => {
                const fam = families.find(f => f.id === inv.family_id);
                const expired = new Date(inv.expires_at) <= new Date() && inv.status === "pendente";
                const realStatus = expired ? "expirado" : inv.status;
                return (
                  <div key={inv.id} className="flex flex-wrap items-center gap-3 justify-between border rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="font-medium">{fam?.name ?? "—"} <span className="text-muted-foreground font-normal">· {inv.parent_name}</span></div>
                      <div className="text-xs text-muted-foreground truncate">{inv.contact} · expira em {fmtDate(inv.expires_at)}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusBadge(realStatus)}
                      {(inv.status === "pendente" && !expired) && (
                        <Button size="sm" variant="outline" onClick={() => copyLink(inviteUrl(inv.token))}>
                          <Copy className="w-3 h-3 mr-1" />Copiar link
                        </Button>
                      )}
                      {(inv.status === "pendente" || inv.status === "expirado" || expired) && (
                        <Button size="sm" variant="outline" onClick={() => resendInvite(inv)}>
                          <RefreshCw className="w-3 h-3 mr-1" />Renovar
                        </Button>
                      )}
                      {inv.status === "pendente" && !expired && (
                        <Button size="sm" variant="ghost" onClick={() => cancelInvite(inv.id)}>
                          <X className="w-3 h-3 mr-1" />Cancelar
                        </Button>
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
          <DialogHeader><DialogTitle>Nova família e convite</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fname">Nome da família</Label>
              <Input id="fname" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Família Silva" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pname">Nome do responsável</Label>
              <Input id="pname" value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Maria Silva" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact">Email ou telefone</Label>
              <Input id="contact" value={contact} onChange={e => setContact(e.target.value)} placeholder="maria@email.com" />
            </div>
            {lastInviteUrl && (
              <div className="rounded-lg bg-muted p-3 text-sm space-y-2">
                <div className="font-medium">Link gerado:</div>
                <div className="break-all text-xs">{lastInviteUrl}</div>
                <Button type="button" size="sm" onClick={() => copyLink(lastInviteUrl)}>
                  <Copy className="w-3 h-3 mr-1" />Copiar
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => { setOpen(false); setLastInviteUrl(null); }}>Fechar</Button>
              <Button type="submit" disabled={busy}>{busy ? "Criando..." : "Criar e gerar convite"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFamilies;
