import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sparkles, Trophy, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

type InviteInfo = {
  family_id: string;
  family_name: string;
  parent_name: string;
  status: string;
  expires_at: string;
  is_valid: boolean;
};

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

const InviteAccept = () => {
  const { token } = useParams<{ token: string }>();
  const nav = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    (async () => {
      if (!token) { setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_invitation_by_token", { _token: token });
      if (!error && data && (data as any[]).length > 0) setInfo((data as any[])[0]);
      setLoading(false);
    })();
  }, [token]);

  // Se usuário já está logado, tenta aceitar diretamente
  const acceptDirect = async () => {
    if (!token) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("accept_invitation", { _token: token });
    setBusy(false);
    if (error) { toast.error("Não foi possível aceitar: " + error.message); return; }
    await refreshProfile();
    toast.success("Bem-vindo à família " + ((data as any)?.family_name ?? "") + "!");
    nav("/app");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setBusy(true);

    const { error: signErr } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/convite/${token}`,
        data: { full_name: parsed.data.name },
      },
    });
    if (signErr) { setBusy(false); toast.error("Erro: " + signErr.message); return; }

    setBusy(false);
    toast.success("Confira seu email para confirmar a conta. Depois você será redirecionado para concluir.");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando convite...</div>;

  if (!info) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl border-0 shadow-card">
          <CardContent className="p-8 text-center space-y-3">
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Convite inválido</h2>
            <p className="text-sm text-muted-foreground">O link não foi reconhecido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!info.is_valid) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl border-0 shadow-card">
          <CardContent className="p-8 text-center space-y-3">
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Convite indisponível</h2>
            <p className="text-sm text-muted-foreground">
              Este convite está {info.status === "aceito" ? "já aceito" : info.status === "cancelado" ? "cancelado" : "expirado"}.
              Peça um novo ao administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-primary-foreground">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card/95 shadow-glow mb-3">
            <Trophy className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-1 drop-shadow-lg">Convite especial!</h1>
          <p className="flex items-center justify-center gap-1 text-primary-foreground/90">
            <Sparkles className="w-4 h-4" /> {info.parent_name}, você foi convidado(a)
          </p>
        </div>

        <Card className="rounded-3xl border-0 shadow-card overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="rounded-2xl bg-muted p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Família</p>
              <p className="text-xl font-display font-bold">{info.family_name}</p>
            </div>

            {user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Você já está logado como <strong>{user.email}</strong>. Aceitar o convite vinculará esta conta à família.
                </p>
                <Button onClick={acceptDirect} disabled={busy} className="w-full" variant="hero" size="lg">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {busy ? "Aceitando..." : "Aceitar convite"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Seu nome</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder={info.parent_name} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pwd">Senha</Label>
                  <Input id="pwd" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                </div>
                <Button type="submit" disabled={busy} className="w-full" variant="hero" size="lg">
                  {busy ? "Criando..." : "Criar conta e aceitar"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Você receberá um email de confirmação. Depois de confirmar, será trazido de volta para finalizar.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InviteAccept;
