import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Supabase auto-exchanges the recovery hash and fires PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setErr(error.message);
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col brand-gradient-bg">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-4">
            <Logo className="h-20" />
            <h1 className="font-display text-2xl uppercase tracking-wider brand-gradient-text">Set new password</h1>
          </div>
          <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            {!ready && (
              <p className="mb-3 text-sm text-muted-foreground">
                Validating reset link… If this stays here, open the link from your email again.
              </p>
            )}
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New password</span>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base focus:border-primary focus:outline-none"
                autoComplete="new-password" minLength={8} />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirm password</span>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base focus:border-primary focus:outline-none"
                autoComplete="new-password" minLength={8} />
            </label>
            {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
            <button type="submit" disabled={busy || !ready}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {busy ? "Saving…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
