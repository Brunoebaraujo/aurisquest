import { Outlet, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import Onboarding from "@/pages/Onboarding";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { AuriIcon } from "@/components/AuriIcon";

const AppLayout = () => {
  const { user, profile, loading } = useAuth();
  const { profile: active } = useActiveProfile();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <AuriIcon size={64} animate />
        <span>Carregando...</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile?.family_id) return <Onboarding />;

  const isSelector = pathname === "/app/quem-entra";

  // Sem perfil ativo → vai pro seletor
  if (!active && !isSelector) {
    return <Navigate to="/app/quem-entra" replace />;
  }

  // Seletor é tela cheia, sem sidebar
  if (isSelector) {
    return <Outlet />;
  }

  // Perfil criança ativo → não pode acessar painel admin; volta pro seletor
  // (a navegação real para o ChildHome compartilhado é via /c, fora deste layout)
  if (active?.kind === "child") {
    return <Navigate to="/app/quem-entra" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card/80 backdrop-blur flex items-center px-4 gap-2 sticky top-0 z-10">
            <SidebarTrigger />
            <AuriIcon size={24} />
            <h1 className="font-display font-semibold text-lg">Auris Quest</h1>
          </header>
          <main className={pathname === "/app/admin/avatar-composer" ? "flex-1 p-4 md:p-6 w-full" : "flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto"}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
