import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Info } from "lucide-react";

const ChildLogin = () => {
  const nav = useNavigate();
  useEffect(() => {
    const stored = localStorage.getItem("jk_child_token");
    if (stored) nav("/c", { replace: true });
  }, [nav]);

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card/95 shadow-glow mb-3">
          <Trophy className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-3xl font-display font-bold drop-shadow text-primary-foreground mb-4">Jornada Kids</h1>
        <Card className="border-0 shadow-card rounded-3xl text-left">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <Info className="w-4 h-4 text-primary" /> Use o link da sua família
            </div>
            <p className="text-sm text-muted-foreground">
              Para proteger a privacidade, cada família tem seu próprio link de acesso.
              Peça ao seu responsável o endereço da sua família — algo como
              <span className="font-mono text-foreground"> /familia/sua-familia/entrar</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChildLogin;
