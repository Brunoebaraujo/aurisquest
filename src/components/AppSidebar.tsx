import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, ListChecks, ClipboardCheck, Gift as GiftIcon, LogOut, CalendarDays, Award, Shield, UsersRound, BarChart3, AlertTriangle, UserPlus, Gift, Palette } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AuriIcon } from "@/components/AuriIcon";

const items = [
  { title: "Painel", url: "/app", icon: LayoutDashboard, end: true },
  { title: "Crianças", url: "/app/criancas", icon: Users },
  { title: "Atividades", url: "/app/atividades", icon: ListChecks },
  { title: "Missões", url: "/app/missoes", icon: Award },
  { title: "Pendências", url: "/app/pendencias", icon: ClipboardCheck },
  { title: "Calendário", url: "/app/calendario", icon: CalendarDays },
  { title: "Mercador", url: "/app/recompensas", icon: GiftIcon },
  { title: "Grupos", url: "/app/grupos", icon: UsersRound },
  { title: "Responsáveis", url: "/app/responsaveis", icon: UserPlus },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut, profile, isAdmin } = useAuth();

  const isActive = (url: string, end?: boolean) =>
    end ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-100 to-blue-200 flex items-center justify-center shadow-soft shrink-0">
            <AuriIcon size={26} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-sidebar-foreground">Auris Quest</span>
              <span className="text-xs text-muted-foreground truncate max-w-[140px]">{profile?.email}</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.end)}>
                    <NavLink to={item.url} end={item.end}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/app/admin/familias")}>
                    <NavLink to="/app/admin/familias">
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Famílias</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/app/admin/utilizacao")}>
                    <NavLink to="/app/admin/utilizacao">
                      <BarChart3 className="h-4 w-4" />
                      {!collapsed && <span>Utilização</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/app/admin/alertas")}>
                    <NavLink to="/app/admin/alertas">
                      <AlertTriangle className="h-4 w-4" />
                      {!collapsed && <span>Alertas</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/app/admin/recompensas")}>
                    <NavLink to="/app/admin/recompensas">
                      <Gift className="h-4 w-4" />
                      {!collapsed && <span>Recompensas</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/app/admin/avatar-composer")}>
                    <NavLink to="/app/admin/avatar-composer">
                      <Palette className="h-4 w-4" />
                      {!collapsed && <span>Avatar Composer</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start">
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
