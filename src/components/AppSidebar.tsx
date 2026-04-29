import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, ListChecks, ClipboardCheck, Wallet, LogOut, Trophy } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Painel", url: "/app", icon: LayoutDashboard, end: true },
  { title: "Crianças", url: "/app/criancas", icon: Users },
  { title: "Atividades", url: "/app/atividades", icon: ListChecks },
  { title: "Pendências", url: "/app/pendencias", icon: ClipboardCheck },
  { title: "Pagamentos", url: "/app/pagamentos", icon: Wallet },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut, profile } = useAuth();

  const isActive = (url: string, end?: boolean) =>
    end ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft shrink-0">
            <Trophy className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-sidebar-foreground">Recompensinhas</span>
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
