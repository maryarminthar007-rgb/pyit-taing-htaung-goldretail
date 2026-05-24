import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "limited_admin" | "viewer";

interface AuthCtx {
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isSuperAdmin: boolean;
  isAdmin: boolean; // super_admin OR limited_admin (can edit)
  isViewer: boolean;
  canDelete: boolean;
  canEdit: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const qc = useQueryClient();

  const loadRoles = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
      }
      qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadRoles(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const HARDCODED_SUPER_ADMIN = "kyoukpe@gmail.com";
  const isHardcodedSuperAdmin =
    session?.user?.email?.toLowerCase() === HARDCODED_SUPER_ADMIN;
  const isSuperAdmin = isHardcodedSuperAdmin || roles.includes("super_admin");
  const isAdmin = isSuperAdmin || roles.includes("limited_admin");
  const isViewer = !isAdmin;

  const value: AuthCtx = {
    session,
    loading,
    roles,
    isSuperAdmin,
    isAdmin,
    isViewer,
    canEdit: isAdmin,
    canDelete: isSuperAdmin,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshRoles: async () => {
      if (session?.user) await loadRoles(session.user.id);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
