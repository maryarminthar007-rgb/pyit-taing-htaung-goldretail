import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, BookOpen, Package, Gem, Shield, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

const items = [
  { title: "Dashboard", subtitle: "ပင်မစာမျက်နှာ", url: "/", icon: LayoutDashboard },
  { title: "Goldsmiths", subtitle: "ပန်းထိမ်ဆရာများ", url: "/goldsmiths", icon: Users },
  { title: "Gemstones", subtitle: "ကျောက်စာရင်း", url: "/gemstones", icon: Gem },
  { title: "Products", subtitle: "ပစ္စည်းအမျိုးအစား", url: "/products", icon: Package },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { session, isSuperAdmin, roles, signOut } = useAuth();
  const isActive = (url: string) =>
    url === "/" ? path === "/" : path.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-gold shadow-gold">
            <BookOpen className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-display text-base font-semibold text-sidebar-foreground">
              Pyit Taing Htaung
            </span>
            <span className="text-[11px] text-sidebar-foreground/60">Gold Retail Ledger</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="text-sm font-medium">{item.title}</span>
                        <span className="text-[10px] text-sidebar-foreground/50">
                          {item.subtitle}
                        </span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/users")} tooltip="Users">
                    <Link to="/admin/users" className="flex items-center gap-3">
                      <Shield className="h-4 w-4" />
                      <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="text-sm font-medium">Users</span>
                        <span className="text-[10px] text-sidebar-foreground/50">
                          ခွင့်ပြုချက်
                        </span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {session && (
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
            {isSuperAdmin && (
              <div className="mb-2 flex items-center gap-1.5 rounded-md bg-gradient-gold px-2 py-1.5 shadow-gold">
                <Shield className="h-3.5 w-3.5 text-sidebar-primary-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-sidebar-primary-foreground">
                  Super Admin
                </span>
              </div>
            )}
            <p className="truncate text-[11px] font-medium text-sidebar-foreground">
              {session.user.email}
            </p>
            <p className="text-[10px] capitalize text-sidebar-foreground/60">
              {isSuperAdmin ? "Full access" : roles[0]?.replace("_", " ") ?? "no role"}
            </p>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={signOut} tooltip="Sign out">
                <LogOut className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
