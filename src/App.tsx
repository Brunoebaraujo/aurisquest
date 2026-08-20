import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppLayout from "./layouts/AppLayout.tsx";
import Dashboard from "./pages/app/Dashboard.tsx";
import Children from "./pages/app/Children.tsx";
import Activities from "./pages/app/Activities.tsx";
import Pending from "./pages/app/Pending.tsx";
import Rewards from "./pages/app/Rewards.tsx";
import RewardCatalog from "./pages/app/RewardCatalog.tsx";
import CalendarPage from "./pages/app/Calendar.tsx";
import Missions from "./pages/app/Missions.tsx";
import ChildProfile from "./pages/app/ChildProfile.tsx";
import ChildLogin from "./pages/ChildLogin.tsx";
import ChildLoginFamily from "./pages/ChildLoginFamily.tsx";
import Responsibles from "./pages/app/Responsibles.tsx";
import ChildHome from "./pages/ChildHome.tsx";
import ChildEquipment from "./pages/ChildEquipment.tsx";
import InviteAccept from "./pages/InviteAccept.tsx";
import AdminFamilies from "./pages/app/AdminFamilies.tsx";
import Groups from "./pages/app/Groups.tsx";
import AurisMonth from "./pages/app/AurisMonth.tsx";
import GroupDetail from "./pages/app/GroupDetail.tsx";
import GroupInviteAccept from "./pages/GroupInviteAccept.tsx";
import AdminUsage from "./pages/app/AdminUsage.tsx";
import AdminAlerts from "./pages/app/AdminAlerts.tsx";
import AdminRewards from "./pages/app/AdminRewards.tsx";
import ProfileSelector from "./pages/app/ProfileSelector.tsx";
import AdminAvatarComposer from "./pages/app/AdminAvatarComposer.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/entrar" element={<ChildLogin />} />
            <Route path="/familia/:familyToken/entrar" element={<ChildLoginFamily />} />
            <Route path="/c" element={<ChildEquipment />} />
            <Route path="/c/jornada" element={<ChildHome />} />
            <Route path="/convite/:token" element={<InviteAccept />} />
            <Route path="/grupo-convite/:token" element={<GroupInviteAccept />} />
            {/* legado: redireciona para nova tela de login */}
            <Route path="/enviar/:childId" element={<ChildLogin />} />
            <Route path="/app" element={<AppLayout />}>
              <Route path="quem-entra" element={<ProfileSelector />} />
              <Route index element={<Dashboard />} />
              <Route path="criancas" element={<Children />} />
              <Route path="criancas/:childId" element={<ChildProfile />} />
              <Route path="atividades" element={<Activities />} />
              <Route path="missoes" element={<Missions />} />
              <Route path="pendencias" element={<Pending />} />
              <Route path="pagamentos" element={<Rewards />} />
              <Route path="recompensas" element={<Rewards />} />
              <Route path="recompensas/catalogo" element={<RewardCatalog />} />
              <Route path="calendario" element={<CalendarPage />} />
              <Route path="auris-mes" element={<AurisMonth />} />
              <Route path="grupos" element={<Groups />} />
              <Route path="grupos/:groupId" element={<GroupDetail />} />
              <Route path="responsaveis" element={<Responsibles />} />
              <Route path="admin/familias" element={<AdminFamilies />} />
              <Route path="admin/utilizacao" element={<AdminUsage />} />
              <Route path="admin/alertas" element={<AdminAlerts />} />
              <Route path="admin/recompensas" element={<AdminRewards />} />
              <Route path="admin/avatar-composer" element={<AdminAvatarComposer />} />
            </Route>
            <Route path="/admin/avatar-composer" element={<Navigate to="/app/admin/avatar-composer" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
