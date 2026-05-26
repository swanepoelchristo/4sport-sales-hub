import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

const LOG = "[reset-password]";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = window.location.hash?.startsWith("#")
          ? window.location.hash.slice(1)
          : "";
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hashType = hashParams.get("type");
        const errorDesc = url.searchParams.get("error_description") || hashParams.get("error_description");

        console.log(LOG, "init", { hasCode: !!code, hasAccessToken: !!accessToken, hashType });

        if (errorDesc) {
          if (!cancelled) { setInitError(errorDesc); setReady(false); }
          return;
        }

        // Existing session (already exchanged) — accept it.
        const existing = await supabase.auth.getSession();
        if (existing.data.session) {
          console.log(LOG, "existing session found");
          if (!cancelled) setReady(true);
          return;
        }

        // PKCE / code-based recovery link
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn(LOG, "exchangeCodeForSession failed", error.message);
            if (!cancelled) { setInitError(error.message); setReady(false); }
            return;
          }
          // Clean ?code= from URL
          url.searchParams.delete("code");
          window.history.replaceState({}, "", url.pathname + url.search + url.hash);
          if (!cancelled) setReady(true);
          return;
        }

        // Hash token recovery link
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.warn(LOG, "setSession failed", error.message);
            if (!cancelled) { setInitError(error.message); setReady(false); }
            return;
          }
          window.history.replaceState({}, "", window.location.pathname);
          if (!cancelled) setReady(true);
          return;
        }

        // Nothing usable
        if (!cancelled) {
          setInitError("This reset link is missing or has already been used. Please request a new one.");
        }
      } catch (e: any) {
        console.warn(LOG, "init exception", e?.message ?? e);
        if (!cancelled) setInitError(e?.message ?? "Could not validate reset link.");
      }
    }

    // Also react to PASSWORD_RECOVERY events fired by supabase-js
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(LOG, "auth event", event, !!session);
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
        setInitError(null);
      }
    });

    init();
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");
    setBusy(true);
    const { data, error } = await supabase.auth.updateUser({ password });
    console.log(LOG, "updateUser result", { ok: !error, userId: data?.user?.id, error: error?.message });
    setBusy(false);
    if (error) {
      setErr(error.message);
      toast.error(`Password update failed: ${error.message}`);
      return;
    }
    toast.success("Password updated. Please sign in with your new password.");
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
            {initError && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {initError}
                <div className="mt-2">
                  <button type="button" onClick={() => navigate({ to: "/forgot-password" })}
                    className="text-xs font-semibold underline">
                    Request a new reset link
                  </button>
                </div>
              </div>
            )}
            {!ready && !initError && (
              <p className="mb-3 text-sm text-muted-foreground">Validating reset link…</p>
            )}
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New password</span>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base focus:border-primary focus:outline-none"
                autoComplete="new-password" minLength={8} disabled={!ready} />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirm password</span>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base focus:border-primary focus:outline-none"
                autoComplete="new-password" minLength={8} disabled={!ready} />
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
