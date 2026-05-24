import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "limited_admin" | "viewer" | "marketing";

interface AuthCtx {
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isSuperAdmin: boolean;
  isAdmin: boolean; // super_admin OR limited_admin (can edit)
  isViewer: boolean;
  isMarketing: boolean;
  canDelete: boolean;
  canEdit: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const HARDCODED_SUPER_ADMIN_EMAIL = "kyoukpe@gmail.com";
const SUPER_ADMIN_ROLES: AppRole[] = ["super_admin"];

function isHardcodedSuperAdminEmail(email?: string | null) {
  return email?.toLowerCase() === HARDCODED_SUPER_ADMIN_EMAIL;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const qc = useQueryClient();

  const loadRoles = async (user: Session["user"]) => {
    if (isHardcodedSuperAdminEmail(user.email)) {
      setRoles(SUPER_ADMIN_ROLES);
      return;
    }

    const uid = user.id;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        if (isHardcodedSuperAdminEmail(s.user.email)) {
          setRoles(SUPER_ADMIN_ROLES);
        } else {
          // defer to avoid deadlock
          setTimeout(() => loadRoles(s.user), 0);
        }
      } else {
        setRoles([]);
      }
      qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadRoles(data.session.user);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const isHardcodedSuperAdmin = isHardcodedSuperAdminEmail(session?.user?.email);
  const effectiveRoles: AppRole[] = isHardcodedSuperAdmin ? SUPER_ADMIN_ROLES : roles;
  const isSuperAdmin = isHardcodedSuperAdmin || roles.includes("super_admin");
  const isAdmin = isSuperAdmin || roles.includes("limited_admin");
  const isMarketing = roles.includes("marketing");
  const isViewer = !isAdmin && !isMarketing;

  const value: AuthCtx = {
    session,
    loading,
    roles: effectiveRoles,
    isSuperAdmin,
    isAdmin,
    isViewer,
    isMarketing,
    canEdit: isAdmin,
    canDelete: isSuperAdmin,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshRoles: async () => {
      if (session?.user) await loadRoles(session.user);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
