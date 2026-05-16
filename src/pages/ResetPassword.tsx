import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { KeyRound, Trophy } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase recovery link sets a session via the hash fragment.
    // Wait briefly and confirm there's a user (recovery session).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error("Mínimo de 6 caracteres"); return; }
    if (pwd !== pwd2) { toast.error("As senhas não coincidem"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Senha atualizada!");
    navigate("/app", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 text-primary-foreground">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card/95 shadow-glow mb-4">
            <Trophy className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2 drop-shadow-lg">Definir nova senha</h1>
          <p className="text-primary-foreground/90 text-sm">Escolha uma senha que você lembre</p>
        </div>

        <Card className="shadow-card border-0 rounded-3xl">
          <CardContent className="p-6">
            {!ready ? (
              <p className="text-sm text-muted-foreground text-center">Validando link de recuperação...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pwd1">Nova senha</Label>
                  <Input id="pwd1" type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Mínimo 6 caracteres" required autoFocus />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd2">Confirmar senha</Label>
                  <Input id="pwd2" type="password" value={pwd2} onChange={e => setPwd2(e.target.value)} placeholder="Repita a senha" required />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                  <KeyRound className="w-4 h-4" /> {busy ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
