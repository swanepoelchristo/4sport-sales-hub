import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("If that account exists, a reset email has been sent.");
  };

  return (
    <div className="flex min-h-screen flex-col brand-gradient-bg">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-4">
            <Logo className="h-20" />
            <h1 className="font-display text-2xl uppercase tracking-wider brand-gradient-text">Reset password</h1>
          </div>
          <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</span>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base focus:border-primary focus:outline-none"
                autoComplete="email"
              />
            </label>
            {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
            {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
            <button type="submit" disabled={busy}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {busy ? "Sending…" : "Send reset link"}
            </button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link to="/login" className="text-primary">Back to sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
