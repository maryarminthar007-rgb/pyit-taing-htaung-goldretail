import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || email },
          },
        });
        if (error) throw error;
        toast.success("Account created. Awaiting Super Admin approval before access.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (r.error) throw r.error instanceof Error ? r.error : new Error(String(r.error));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-gradient-surface p-8 shadow-gold">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-gold shadow-gold">
            <BookOpen className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold">Pyit Taing Htaung</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gold">
            Gold Retail Ledger
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <Label>Name · အမည်</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="U Maung Maung" />
            </div>
          )}
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button onClick={google} disabled={busy} variant="outline" className="w-full">
          Continue with Google
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {mode === "signin" ? "No account?" : "Have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-medium text-gold hover:underline"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
