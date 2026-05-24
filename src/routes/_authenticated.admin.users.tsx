import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Shield } from "lucide-react";
import { toast } from "sonner";

const HARDCODED_SUPER_ADMIN_EMAIL = "kyoukpe@gmail.com";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const { isSuperAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        role:
          p.email?.toLowerCase() === HARDCODED_SUPER_ADMIN_EMAIL
            ? "super_admin"
            : ((roles ?? []).find((r) => r.user_id === p.id)?.role as AppRole | undefined),
      }));
    },
    enabled: isSuperAdmin,
  });

  const setRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: AppRole }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", user_id);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isSuperAdmin) return <Navigate to="/" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Admin · ခွင့်ပြုချက်
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">User Permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign roles: Super Admin (full), Limited Admin (edit), Viewer (read-only).
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3 font-medium">User</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : data.map((u) => {
              const isOwner = u.email?.toLowerCase() === HARDCODED_SUPER_ADMIN_EMAIL;
              return (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium">{u.display_name ?? "—"}</td>
                  <td className="px-6 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-3">
                    <Select
                      value={isOwner ? "super_admin" : u.role ?? "viewer"}
                      disabled={isOwner}
                      onValueChange={(v) => setRole.mutate({ user_id: u.id, role: v as AppRole })}
                    >
                      <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin · အပြည့်ပိုင်ဆိုင်</SelectItem>
                        <SelectItem value="limited_admin">Limited Admin · တည်းဖြတ်သာ</SelectItem>
                        <SelectItem value="viewer">Viewer · ကြည့်သာ</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
