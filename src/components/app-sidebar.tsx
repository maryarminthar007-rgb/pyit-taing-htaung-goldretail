import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, BookOpen, Package, Gem, Shield, LogOut, Activity, Megaphone, ClipboardList, Landmark } from "lucide-react";
import pthLogo from "@/assets/pth-logo.png.asset.json";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

function usePendingMarketing(enabled: boolean) {
  const queryClient = useQueryClient();
  const { data = 0 } = useQuery({
    queryKey: ["marketing-pending-count"],
    enabled,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase.from("marketing_orders").select("id", { count: "exact", head: true }).eq("status", "pending").is("viewed_at", null);
      return count ?? 0;
    },
  });
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (prev.current !== null && data > prev.current) {
      toast.info(`New marketing order${data - prev.current > 1 ? "s" : ""} arrived · လမ်းကြောင်းမှာစာအသစ် (${data - prev.current})`);
    }
    prev.current = data;
  }, [data, enabled]);
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("marketing-order-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["marketing-pending-count"] });
        queryClient.invalidateQueries({ queryKey: ["marketing_orders"] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [enabled, queryClient]);
  return data;
}

const items = [
  { title: "Dashboard", subtitle: "ပင်မစာမျက်နှာ", url: "/", icon: LayoutDashboard },
  { title: "Goldsmiths", subtitle: "ပန်းထိမ်ဆရာများ", url: "/goldsmiths", icon: Users },
  { title: "Work Status", subtitle: "အလုပ်ရှိ / မရှိ", url: "/work-status", icon: Activity },
  { title: "Deposits", subtitle: "စပေါ် အချုပ်ဇယား", url: "/deposits", icon: Landmark },
  { title: "Gemstones", subtitle: "ကျောက်စာရင်း", url: "/gemstones", icon: Gem },
  { title: "Products", subtitle: "ပစ္စည်းအမျိုးအစား", url: "/products", icon: Package },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { session, isSuperAdmin, isAdmin, isMarketing, roles, signOut } = useAuth();
  const marketingOnly = isMarketing && !isAdmin;
  const pending = usePendingMarketing(isAdmin);
  const visibleItems = marketingOnly ? [] : isAdmin ? [...items, { title: "Gold Stock", subtitle: "ရွှေပေး", url: "/gold-stock", icon: Landmark }] : items;
  const isActive = (url: string) =>
    url === "/" ? path === "/" : path.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-gold shadow-gold ring-1 ring-sidebar-border">
            <img
              src={pthLogo.url}
              alt="Pyit Taing Htaung Gold Smith logo"
              className="h-10 w-10 object-contain"
            />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-display text-base font-semibold text-sidebar-foreground">
              Pyit Taing Htaung
            </span>
            <span className="text-[11px] text-sidebar-foreground/60">Gold Smith Ledger</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {visibleItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleItems.map((item) => (
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
        )}

        {(isMarketing || isAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Marketing · လမ်းကြောင်း</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/marketing")} tooltip="Place Order">
                    <Link to="/marketing" className="flex items-center gap-3">
                      <Megaphone className="h-4 w-4" />
                      <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="text-sm font-medium">Place Order</span>
                        <span className="text-[10px] text-sidebar-foreground/50">
                          အမှာစာတင်ရန်
                        </span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin/marketing-orders")} tooltip="Marketing Orders">
                      <Link to="/admin/marketing-orders" className="flex items-center gap-3">
                        <ClipboardList className="h-4 w-4" />
                        <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            Marketing Orders
                            {pending > 0 && (
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-none text-destructive-foreground shadow-sm" aria-label={`${pending} unread marketing orders`}>{pending > 99 ? "99+" : pending}</span>
                            )}
                          </span>
                          <span className="text-[10px] text-sidebar-foreground/50">
                            လမ်းကြောင်းမှာစာစာရင်း
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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
