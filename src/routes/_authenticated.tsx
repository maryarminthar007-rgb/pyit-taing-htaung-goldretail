import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const { session, loading, isApproved, signOut } = useAuth();
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!session) return <Navigate to="/login" />;
  if (!isApproved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-5 rounded-2xl border bg-gradient-surface p-8 text-center shadow-gold">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-gold shadow-gold">
            <Clock className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Account Status</p>
            <h1 className="mt-2 font-display text-2xl font-semibold">Pending Approval</h1>
            <p className="mt-1 text-sm text-muted-foreground">အတည်ပြုချက်စိစစ်ဆဲ</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Your account has been created and is awaiting Super Admin approval.
            You'll get access once a role is assigned to you.
          </p>
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {session.user.email}
          </p>
          <Button onClick={signOut} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
