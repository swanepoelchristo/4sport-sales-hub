import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { DEMO_USERS } from "@/lib/mockData";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { login, user } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const profile = login(email.trim(), password);
    if (!profile) { setError("Invalid email or password."); return; }
    navigate({ to: "/dashboard" });
  };

  const quickLogin = (em: string, pw: string) => {
    setEmail(em); setPassword(pw); setError(null);
    const profile = login(em, pw);
    if (profile) navigate({ to: "/dashboard" });
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
              type="submit"
              className="mt-6 w-full rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Sign in
            </button>

            <div className="mt-6 border-t border-border pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Demo users</p>
              <div className="space-y-2">
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.id} type="button" onClick={() => quickLogin(u.email, u.password)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2 text-left text-sm hover:border-primary"
                  >
                    <span>
                      <span className="font-medium">{u.full_name}</span>
                      <span className="ml-2 text-xs uppercase tracking-wider text-primary">{u.role}</span>
                      <span className="block text-xs text-muted-foreground">{u.email}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">Sign in →</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>
      <footer className="border-t border-border bg-card/60 px-4 py-4 text-center text-xs text-muted-foreground">
        © 2026 4SPORT. All rights reserved. Created by Milk Box AI.
      </footer>
    </div>
  );
}
