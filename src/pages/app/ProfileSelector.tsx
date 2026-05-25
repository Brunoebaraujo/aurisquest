import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Loader2 } from "lucide-react";
import { AuriIcon } from "@/components/AuriIcon";
import { toast } from "sonner";
import { setActiveProfileDirect } from "@/hooks/useActiveProfile";

type ChildRow = { id: string; name: string; avatar_url: string | null };

const ProfileSelector = () => {
  const nav = useNavigate();
  const { profile, signOut } = useAuth();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [enteringId, setEnteringId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!profile?.family_id) return;
      const { data, error } = await supabase
        .from("children")
        .select("id, name, avatar_url")
        .eq("family_id", profile.family_id)
        .eq("active", true)
        .order("name");
      if (!alive) return;
      if (error) toast.error("Erro ao carregar crianças");
      setChildren((data ?? []) as ChildRow[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [profile?.family_id]);

  const goParent = () => {
    setActiveProfileDirect({ kind: "parent" });
    nav("/app", { replace: true });
  };

  const goChild = async (child: ChildRow) => {
    setEnteringId(child.id);
    try {
      const { data, error } = await supabase.functions.invoke("child-preview-session", {
        body: { child_id: child.id },
      });
      if (error || !data?.token) throw new Error(error?.message || "Erro");
      localStorage.setItem("jk_child_token", data.token);
      localStorage.setItem("jk_child", JSON.stringify(data.child));
      localStorage.setItem("aq_shared_mode", "1");
      setActiveProfileDirect({ kind: "child", childId: child.id });
      nav("/c", { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao entrar");
      setEnteringId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-background to-blue-50 flex flex-col">
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-10 flex flex-col">
        <header className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 blur-2xl bg-sky-300/40 rounded-full" />
              <AuriIcon size={80} className="relative" />
            </div>
          </div>
          <h1 className="font-display font-bold text-4xl mb-2">Quem entrará?</h1>
          <p className="text-muted-foreground">Toque no seu perfil para começar</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Responsável */}
            <button
              onClick={goParent}
              className="group focus:outline-none focus:ring-4 focus:ring-primary/30 rounded-3xl"
            >
              <Card className="p-5 rounded-3xl border-2 border-primary/20 hover:border-primary hover:-translate-y-1 hover:shadow-glow transition-all bg-gradient-to-b from-card to-primary/5 aspect-[3/4] flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Shield className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="font-display font-bold text-lg">Responsável</div>
                <div className="text-xs text-muted-foreground mt-1">Painel completo</div>
              </Card>
            </button>

            {/* Crianças */}
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => goChild(c)}
                disabled={enteringId !== null}
                className="group focus:outline-none focus:ring-4 focus:ring-accent/40 rounded-3xl disabled:opacity-60"
              >
                <Card className="p-5 rounded-3xl border-2 border-border hover:border-accent hover:-translate-y-1 hover:shadow-glow transition-all bg-card aspect-[3/4] flex flex-col items-center justify-center">
                  {c.avatar_url ? (
                    <img
                      src={c.avatar_url}
                      alt={c.name}
                      className="w-20 h-20 rounded-full object-cover mb-3 group-hover:scale-110 transition-transform border-2 border-accent/30"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-warm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <span className="font-display font-bold text-3xl text-secondary-foreground">
                        {c.name[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="font-display font-bold text-lg truncate max-w-full">{c.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {enteringId === c.id ? "Entrando..." : "Modo criança"}
                  </div>
                </Card>
              </button>
            ))}

            {children.length === 0 && (
              <Card className="p-6 rounded-3xl col-span-full text-center text-sm text-muted-foreground">
                Nenhuma criança cadastrada. Acesse o painel do responsável para adicionar.
              </Card>
            )}
          </div>
        )}

        <div className="mt-auto pt-8 flex justify-center">
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1" /> Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSelector;
