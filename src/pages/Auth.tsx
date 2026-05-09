import { useState } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const emailSchema = z.string().trim().email("E-mail inválido").max(255);
const passwordSchema = z.string().min(6, "Senha precisa ter ao menos 6 caracteres").max(72);
const nameSchema = z.string().trim().min(1, "Informe seu nome").max(100);

const Auth = () => {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPwd, setSignupPwd] = useState("");

  if (!loading && user) return <Navigate to="/app" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPwd);
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message ?? "Dados inválidos");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPwd,
    });
    setBusy(false);
    if (error) toast.error("Não foi possível entrar: " + error.message);
    else toast.success("Bem-vindo de volta!");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nameSchema.parse(signupName);
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPwd);
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message ?? "Dados inválidos");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: signupName },
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível criar conta: " + error.message);
    } else {
      toast.success("Conta criada! Você já pode entrar.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 text-primary-foreground">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card/95 shadow-glow mb-4">
            <Trophy className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-4xl font-display font-bold mb-2 drop-shadow-lg">Auris Quest</h1>
          <p className="text-primary-foreground/90 flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4" /> Recompense as conquistas em casa
          </p>
        </div>

        <Card className="shadow-card border-0 rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input id="login-email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-pwd">Senha</Label>
                    <Input id="login-pwd" type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} placeholder="••••••" required />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                    {busy ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Seu nome</Label>
                    <Input id="signup-name" value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Maria Silva" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input id="signup-email" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-pwd">Senha</Label>
                    <Input id="signup-pwd" type="password" value={signupPwd} onChange={e => setSignupPwd(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                    {busy ? "Criando..." : "Criar minha conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-primary-foreground/80 text-sm mt-6">
          Para responsáveis. Crianças entram em uma tela separada (em breve).
        </p>
      </div>
    </div>
  );
};

export default Auth;
