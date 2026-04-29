import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";

type ChildOption = { id: string; name: string; avatar_url: string | null; has_password: boolean };

const ChildLogin = () => {
  const nav = useNavigate();
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selected, setSelected] = useState<ChildOption | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("jk_child_token");
    if (stored) {
      nav("/c", { replace: true });
      return;
    }
    supabase.rpc("list_active_children_public").then(({ data, error }) => {
      if (error) toast.error("Erro ao carregar crianças");
      else setChildren((data ?? []) as ChildOption[]);
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (password.length < 4) { toast.error("Senha muito curta"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("child-login", {
        body: { child_id: selected.id, password },
      });
      if (error || !data?.token) {
        toast.error("Senha incorreta. Tente de novo.");
        return;
      }
      localStorage.setItem("jk_child_token", data.token);
      localStorage.setItem("jk_child", JSON.stringify(data.child));
      nav("/c", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-primary-foreground">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card/95 shadow-glow mb-3">
            <Trophy className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold drop-shadow">Jornada Kids</h1>
          <p className="text-primary-foreground/90 text-sm flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4" /> Quem está aqui agora?
          </p>
        </div>

        <Card className="border-0 shadow-card rounded-3xl">
          <CardContent className="p-5 space-y-4">
            {!selected ? (
              <>
                <h2 className="font-display font-bold text-lg text-center">Toque no seu nome</h2>
                <div className="grid grid-cols-2 gap-3">
                  {children.map(c => (
                    <button
                      key={c.id}
                      onClick={() => c.has_password ? setSelected(c) : toast.error("Esta criança ainda não tem senha. Peça ao responsável.")}
                      className={`p-4 rounded-2xl border-2 transition-bounce ${c.has_password ? "border-border hover:border-primary hover:shadow-soft bg-card" : "border-dashed border-muted bg-muted/30 opacity-60"}`}
                    >
                      <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <div className="font-semibold text-center">{c.name}</div>
                      {!c.has_password && <div className="text-[10px] text-muted-foreground text-center mt-1">sem senha</div>}
                    </button>
                  ))}
                </div>
                {children.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">Nenhuma criança cadastrada ainda.</p>
                )}
              </>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">
                    {selected.name[0]?.toUpperCase()}
                  </div>
                  <div className="font-display font-bold text-xl">Oi, {selected.name}!</div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" /> Digite sua senha
                  </div>
                </div>
                <Input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••"
                  className="text-center text-2xl tracking-widest h-14"
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setSelected(null); setPassword(""); }}>Voltar</Button>
                  <Button type="submit" variant="hero" className="flex-1" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChildLogin;
