import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppLayout from "./layouts/AppLayout.tsx";
import Dashboard from "./pages/app/Dashboard.tsx";
import Children from "./pages/app/Children.tsx";
import Activities from "./pages/app/Activities.tsx";
import Pending from "./pages/app/Pending.tsx";
import Payments from "./pages/app/Payments.tsx";
import CalendarPage from "./pages/app/Calendar.tsx";
import Missions from "./pages/app/Missions.tsx";
import ChildProfile from "./pages/app/ChildProfile.tsx";
import ChildSubmit from "./pages/ChildSubmit.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/enviar/:childId" element={<ChildSubmit />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="criancas" element={<Children />} />
              <Route path="criancas/:childId" element={<ChildProfile />} />
              <Route path="atividades" element={<Activities />} />
              <Route path="missoes" element={<Missions />} />
              <Route path="pendencias" element={<Pending />} />
              <Route path="pagamentos" element={<Payments />} />
              <Route path="calendario" element={<CalendarPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
