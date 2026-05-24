import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, BookOpen, Package } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", subtitle: "ပင်မစာမျက်နှာ", url: "/", icon: LayoutDashboard },
  { title: "Goldsmiths", subtitle: "ပန်းထိမ်ဆရာများ", url: "/goldsmiths", icon: Users },
  { title: "Products", subtitle: "ပစ္စည်းအမျိုးအစား", url: "/products", icon: Package },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
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
      </SidebarContent>
    </Sidebar>
  );
}
