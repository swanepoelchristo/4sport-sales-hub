import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { audit } from "@/lib/audit";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { login, user } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      // Failed login can't write under user's auth.uid() (none yet) — log client-side only.
      console.warn("[login.failed]", trimmed, result.error);
      return;
    }
    void audit("login.success", trimmed);
    navigate({ to: "/dashboard" });
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
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <button
              type="submit" disabled={busy}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Accounts are created by an administrator.
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
