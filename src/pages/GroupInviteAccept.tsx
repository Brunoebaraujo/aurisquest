import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Sparkles, UsersRound, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const GroupInviteAccept = () => {
  const { token } = useParams<{ token: string }>();
  const nav = useNavigate();
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Auto-aceita se já tem família
    if (profile?.family_id && token) {
      void accept();
    }
  }, [user, profile?.family_id, token]);

  const accept = async () => {
    if (!token) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("accept_shared_group_invitation", { _token: token });
    setBusy(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    setDone(true);
    toast.success("Você entrou no grupo!");
    setTimeout(() => nav(`/app/grupos/${(data as any).group_id}`), 800);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl border-0 shadow-card">
          <CardContent className="p-8 text-center space-y-4">
            <UsersRound className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-display font-bold">Convite para um grupo</h2>
            <p className="text-sm text-muted-foreground">
              Entre ou crie sua conta de responsável para aceitar o convite e participar das missões compartilhadas.
            </p>
            <Button asChild variant="hero" className="w-full">
              <Link to={`/auth?next=${encodeURIComponent(`/grupo-convite/${token}`)}`}>Entrar / Criar conta</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile?.family_id) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl border-0 shadow-card">
          <CardContent className="p-8 text-center space-y-4">
            <Sparkles className="w-12 h-12 text-accent mx-auto" />
            <h2 className="text-xl font-display font-bold">Cadastre sua família primeiro</h2>
            <p className="text-sm text-muted-foreground">
              Para aceitar o convite, complete o cadastro da sua família.
            </p>
            <Button asChild variant="hero" className="w-full">
              <Link to="/onboarding">Continuar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-card">
        <CardContent className="p-8 text-center space-y-4">
          {done ? (
            <>
              <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
              <h2 className="text-xl font-display font-bold">Pronto!</h2>
              <p className="text-sm text-muted-foreground">Levando você ao grupo...</p>
            </>
          ) : (
            <>
              <UsersRound className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-xl font-display font-bold">Aceitar convite</h2>
              <Button onClick={accept} disabled={busy} variant="hero" className="w-full">
                {busy ? "Entrando..." : "Aceitar e entrar no grupo"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupInviteAccept;
