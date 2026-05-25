import { useState } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { Sparkles, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { setActiveProfileDirect } from "@/hooks/useActiveProfile";
import { AuriIcon } from "@/components/AuriIcon";
import { toast } from "sonner";
import authBg from "@/assets/auth-bg.jpg";

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
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  if (!loading && user) return <Navigate to="/app" replace />;

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(forgotEmail); } catch (err: any) {
      toast.error(err.errors?.[0]?.message ?? "E-mail inválido"); return;
    }
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotBusy(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Enviamos um link de recuperação para o seu e-mail.");
    setForgotOpen(false);
    setForgotEmail("");
  };

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
    setActiveProfileDirect(null);
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
    setActiveProfileDirect(null);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: signupName },
      },
    });
    setBusy(false);
    if (error) toast.error("Não foi possível criar conta: " + error.message);
    else toast.success("Conta criada! Você já pode entrar.");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-8 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${authBg})` }}
    >
      {/* Soft sky overlay top */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-sky-900/10 pointer-events-none" />

      <div className="relative w-full max-w-md flex flex-col items-center">
        {/* Hero: crystal + title */}
        <div className="text-center mt-6 mb-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 blur-3xl bg-sky-200/70 rounded-full scale-150" />
            <div className="absolute inset-0 blur-2xl bg-white/40 rounded-full scale-125" />
            <AuriIcon size={140} className="relative drop-shadow-2xl" />
          </div>
          <h1 className="mt-4 text-5xl font-display font-bold text-white drop-shadow-[0_4px_12px_rgba(30,64,175,0.6)]">
            Auris Quest
          </h1>
          <p className="mt-2 text-white/95 flex items-center justify-center gap-1.5 drop-shadow-md">
            <Sparkles className="w-4 h-4" /> Recompense as conquistas em casa
          </p>
        </div>

        {/* Floating card */}
        <Card className="w-full shadow-2xl border-0 rounded-[2rem] overflow-hidden bg-white/95 backdrop-blur">
          <CardContent className="p-6">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6 rounded-2xl bg-sky-50 p-1 h-12">
                <TabsTrigger value="login" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow font-semibold">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow font-semibold">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-primary font-semibold">E-mail</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input id="login-email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="seu@email.com" required className="pl-10 h-12 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-pwd" className="text-primary font-semibold">Senha</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input id="login-pwd" type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} placeholder="••••••" required className="pl-10 h-12 rounded-xl" />
                    </div>
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full h-12 rounded-xl text-base" disabled={busy}>
                    {busy ? "Entrando..." : "Entrar"}
                  </Button>
                  <button type="button" onClick={() => { setForgotEmail(loginEmail); setForgotOpen(true); }} className="block w-full text-center text-sm text-primary font-semibold hover:underline mt-2">
                    Esqueci minha senha
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-primary font-semibold">Seu nome</Label>
                    <Input id="signup-name" value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Maria Silva" required className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-primary font-semibold">E-mail</Label>
                    <Input id="signup-email" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="seu@email.com" required className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-pwd" className="text-primary font-semibold">Senha</Label>
                    <Input id="signup-pwd" type="password" value={signupPwd} onChange={e => setSignupPwd(e.target.value)} placeholder="Mínimo 6 caracteres" required className="h-12 rounded-xl" />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full h-12 rounded-xl text-base" disabled={busy}>
                    {busy ? "Criando..." : "Criar minha conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-white text-sm mt-6 drop-shadow-md flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/30 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          Para responsáveis. Crianças entram em uma tela separada.
        </p>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Esqueci minha senha</DialogTitle>
            <DialogDescription>Enviaremos um link de recuperação para o seu e-mail.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-mail</Label>
              <Input id="forgot-email" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="seu@email.com" required autoFocus />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={forgotBusy}>
              {forgotBusy ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
