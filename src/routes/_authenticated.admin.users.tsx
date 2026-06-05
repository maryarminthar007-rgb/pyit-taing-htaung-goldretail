import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Shield, Check, Clock } from "lucide-react";
import { toast } from "sonner";

const HARDCODED_SUPER_ADMIN_EMAIL = "kyoukpe@gmail.com";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

type Status = "pending" | "approved";

function AdminUsers() {
  const { isSuperAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [pendingRoles, setPendingRoles] = useState<Record<string, AppRole>>({});

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, email, display_name, status, created_at").order("created_at"),
        supabase.from("user_roles").select("*"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        status: (p as { status?: string }).status as Status | undefined,
        role:
          p.email?.toLowerCase() === HARDCODED_SUPER_ADMIN_EMAIL
            ? ("super_admin" as AppRole)
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

  const approve = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: AppRole }) => {
      await supabase.from("user_roles").delete().eq("user_id", user_id);
      const { error: rErr } = await supabase.from("user_roles").insert({ user_id, role });
      if (rErr) throw rErr;
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("id", user_id);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      toast.success("User approved");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isSuperAdmin) return <Navigate to="/" />;

  const pending = data.filter((u) => u.status === "pending");
  const approved = data.filter((u) => u.status !== "pending");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
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
            Approve new sign-ups and assign roles. Only Super Admin can delete data.
          </p>
        </div>
      </div>

      {/* Pending approvals */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gold" />
          <h2 className="font-display text-lg font-semibold">
            Pending Approval · အတည်ပြုချက်စိစစ်ဆဲ
          </h2>
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
            {pending.length}
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Assign Role</th>
                <th className="px-6 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : pending.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No pending sign-ups.</td></tr>
              ) : pending.map((u) => {
                const selected = pendingRoles[u.id] ?? "limited_admin";
                return (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium">{u.display_name ?? "—"}</td>
                    <td className="px-6 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-6 py-3">
                      <Select
                        value={selected}
                        onValueChange={(v) =>
                          setPendingRoles((s) => ({ ...s, [u.id]: v as AppRole }))
                        }
                      >
                        <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="limited_admin">Staff · ရုံးပိုင်းဝန်ထမ်း</SelectItem>
                          <SelectItem value="marketing">Marketing · အရောင်းသမား</SelectItem>
                          <SelectItem value="viewer">Viewer · ကြည့်သာ</SelectItem>
                          <SelectItem value="super_admin">Super Admin · အပြည့်ပိုင်ဆိုင်</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-3">
                      <Button
                        size="sm"
                        onClick={() => approve.mutate({ user_id: u.id, role: selected })}
                        className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90"
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Approve · ခွင့်ပြုမည်
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Approved users */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Approved Users · အတည်ပြုပြီး</h2>
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
              {approved.map((u) => {
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
                          <SelectItem value="limited_admin">Staff · ရုံးပိုင်းဝန်ထမ်း</SelectItem>
                          <SelectItem value="marketing">Marketing · အရောင်းသမား</SelectItem>
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
      </section>
    </div>
  );
}
