import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PROFILE_LOAD_ERROR, useStore } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { audit } from "@/lib/audit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { login, retryProfileLoad, collectDebugReport, finalizing, user } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [debug, setDebug] = useState<Awaited<ReturnType<typeof collectDebugReport>> | null>(null);
  const [copied, setCopied] = useState(false);

  // Clean stale recovery state / broken PKCE verifiers on mount.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const errDesc = url.searchParams.get("error_description") || url.hash.includes("error_description");
      if (errDesc) {
        // Drop the broken recovery params from the URL.
        window.history.replaceState({}, "", url.pathname);
        setError(typeof errDesc === "string" ? errDesc : "This link has expired. Please request a new one.");
      }
      // Stale PKCE verifier from an abandoned reset flow can poison the next sign-in.
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("sb-") && k.endsWith("-auth-token-code-verifier")) {
          localStorage.removeItem(k);
        }
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const trimmed = email.trim();
    const result = await login(trimmed, password);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      console.warn("[login.failed]", trimmed, result.error);
      if (result.error === PROFILE_LOAD_ERROR) {
        try { setDebug(await collectDebugReport()); } catch (e) { console.warn("[debug.collect.error]", e); }
      }
      return;
    }
    void audit("login.success", trimmed);
    // Confirm session is really there before navigating.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setError("Session did not persist. Please try again.");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  };

  const retryProfile = async () => {
    setBusy(true);
    setError(null);
    const result = await retryProfileLoad();
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      try { setDebug(await collectDebugReport()); } catch (e) { console.warn("[debug.collect.error]", e); }
      return;
    }
    setDebug(null);
    navigate({ to: "/dashboard", replace: true });
  };

  const copyDebug = async () => {
    if (!debug) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(debug, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("[debug.copy.error]", e);
    }
  };


  return (
    <div className="flex min-h-screen flex-col brand-gradient-bg">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-4">
            <Logo className="h-20" />
            <h1 className="font-display text-2xl uppercase tracking-wider brand-gradient-text">
              Sales Rep Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">Sign in to manage your pipeline.</p>
          </div>

          <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</span>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base focus:border-primary focus:outline-none"
                placeholder="you@4sport.co.za" autoComplete="email"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</span>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base focus:border-primary focus:outline-none"
                placeholder="••••••••" autoComplete="current-password"
              />
            </label>
            {finalizing && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Finalizing session…</span>
              </div>
            )}
            {error && !finalizing && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-destructive">{error}</p>
                {error === PROFILE_LOAD_ERROR && (
                  <button
                    type="button"
                    onClick={retryProfile}
                    disabled={busy}
                    className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
                  >
                    Retry profile load
                  </button>
                )}
              </div>
            )}

            <button
              type="submit" disabled={busy}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <div className="mt-4 flex items-center justify-between text-xs">
              <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
              <Link to="/bootstrap-admin" className="text-muted-foreground hover:text-primary hover:underline">First-time setup</Link>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Accounts are created by an administrator.{" "}
              <Link to="/forgot-password" className="text-primary hover:underline">Reset password again</Link>
            </p>
          </form>
        </div>
      </div>
      <footer className="border-t border-border bg-card/60 px-4 py-4 text-center text-xs text-muted-foreground">
        © 2026 4SPORT. All rights reserved. Created by Milk Box AI.
      </footer>
    </div>
  );
}
