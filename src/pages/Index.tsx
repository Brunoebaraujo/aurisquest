import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, Camera, Wallet, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;

  const features = [
    { icon: ClipboardCheck, title: "Atividades do dia a dia", desc: "Cadastre tarefas com recompensa em reais." },
    { icon: Camera, title: "Provas com foto", desc: "A criança envia foto, você aprova num toque." },
    { icon: Wallet, title: "Saldo e pagamentos", desc: "Acompanhe quanto cada criança ganhou e pagou." },
    { icon: Sparkles, title: "Missões e medalhas", desc: "Em breve: bônus por sequências e conquistas." },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero text-primary-foreground">
      <div className="max-w-5xl mx-auto px-4 py-12 md:py-20">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-card/95 flex items-center justify-center shadow-glow">
              <Trophy className="w-5 h-5 text-accent" />
            </div>
            <span className="font-display font-bold text-xl">Auris Quest</span>
          </div>
          <Button asChild variant="reward" size="sm"><Link to="/auth">Entrar</Link></Button>
        </header>

        <main className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-display font-bold mb-4 drop-shadow-lg leading-tight">
            Recompense as<br />conquistas em casa ✨
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8">
            Um app simples para pais e filhos: cadastre tarefas, defina valores em reais, aprove fotos e veja a mágica acontecer.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild variant="reward" size="xl"><Link to="/auth">Começar agora</Link></Button>
          </div>
        </main>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-16">
          {features.map(f => (
            <div key={f.title} className="bg-card/15 backdrop-blur rounded-2xl p-5 border border-card/20">
              <f.icon className="w-7 h-7 mb-3 text-accent" />
              <h3 className="font-display font-bold text-lg mb-1">{f.title}</h3>
              <p className="text-primary-foreground/85 text-sm">{f.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default Index;
