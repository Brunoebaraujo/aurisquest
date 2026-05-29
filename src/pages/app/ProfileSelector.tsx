import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { AuriIcon } from "@/components/AuriIcon";
import { toast } from "sonner";
import { setActiveProfileDirect } from "@/hooks/useActiveProfile";
import authBg from "@/assets/auth-bg.jpg";
import wizardImg from "@/assets/wizard.png";
import { useFamilyCosmetics } from "@/hooks/useFamilyCosmetics";
import { EquippedAvatar } from "@/components/cosmetics/EquippedAvatar";

type ChildRow = { id: string; name: string; avatar_url: string | null };

const ProfileSelector = () => {
  const nav = useNavigate();
  const { profile, signOut } = useAuth();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const cosmetics = useFamilyCosmetics(children.map((c) => c.id));



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
    <div
      className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${authBg})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-sky-900/20 pointer-events-none" />

      <div className="relative flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="absolute inset-0 blur-3xl bg-sky-200/70 rounded-full scale-150" />
              <AuriIcon size={88} className="relative drop-shadow-2xl" />
            </div>
          </div>
          <h1 className="font-display font-bold text-5xl text-white drop-shadow-[0_4px_12px_rgba(30,64,175,0.6)]">
            Quem entrará?
          </h1>
          <p className="mt-2 text-white/95 drop-shadow-md">Toque no seu perfil para começar</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            {/* Responsável — destaque */}
            <button
              onClick={goParent}
              className="group focus:outline-none focus:ring-4 focus:ring-primary/40 rounded-[2rem] w-full max-w-xs"
            >
              <Card className="p-5 rounded-[2rem] border-0 shadow-2xl hover:-translate-y-1 hover:shadow-glow transition-all bg-white/95 backdrop-blur flex flex-col items-center">
                <div className="w-full aspect-square rounded-2xl bg-gradient-to-b from-sky-100 to-sky-50 overflow-hidden flex items-center justify-center group-hover:scale-[1.02] transition-transform">
                  <img src={wizardImg} alt="Responsável" className="w-full h-full object-contain" loading="lazy" />
                </div>
                <div className="font-display font-bold text-2xl mt-3">{profile?.name || "Responsável"}</div>
                <div className="text-sm text-muted-foreground">Painel completo</div>
              </Card>
            </button>

            {/* Crianças */}
            {children.length > 0 && (
              <div className="grid grid-cols-3 gap-3 w-full">
                {children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => goChild(c)}
                    disabled={enteringId !== null}
                    className="group focus:outline-none focus:ring-4 focus:ring-accent/40 rounded-3xl disabled:opacity-60"
                  >
                    <Card className="p-3 rounded-3xl border-0 shadow-xl hover:-translate-y-1 hover:shadow-glow transition-all bg-white/95 backdrop-blur flex flex-col items-center">
                      {(() => {
                        const eq = cosmetics[c.id]?.equipment;
                        const avatarUrl = eq?.avatar?.image_url ?? c.avatar_url;
                        if (avatarUrl) {
                          return (
                            <img
                              src={avatarUrl}
                              alt={c.name}
                              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover group-hover:scale-110 transition-transform border-4 border-white shadow-md"
                            />
                          );
                        }
                        return (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-warm flex items-center justify-center group-hover:scale-110 transition-transform border-4 border-white shadow-md">
                            <span className="font-display font-bold text-3xl text-secondary-foreground">
                              {c.name[0]?.toUpperCase()}
                            </span>
                          </div>
                        );
                      })()}
                      <div className="font-display font-bold text-base mt-2 truncate max-w-full">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {enteringId === c.id ? "Entrando..." : "Modo criança"}
                      </div>
                    </Card>
                  </button>
                ))}
              </div>
            )}

            {children.length === 0 && (
              <Card className="p-6 rounded-3xl w-full text-center text-sm text-muted-foreground bg-white/90 backdrop-blur border-0 shadow-xl">
                Nenhuma criança cadastrada. Acesse o painel do responsável para adicionar.
              </Card>
            )}
          </div>
        )}

        <div className="mt-auto pt-8 flex justify-center">
          <Button variant="ghost" size="sm" onClick={signOut} className="text-white hover:bg-white/20 hover:text-white">
            <LogOut className="w-4 h-4 mr-1" /> Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSelector;
