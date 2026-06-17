import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { audit } from "@/lib/audit";

export const Route = createFileRoute("/call-centre-signup")({ component: CallCentreSignupPage });

const INVITE_CODE = "4SPORT-CALLCENTER-2026";

function CallCentreSignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const cleanInviteCode = inviteCode.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (cleanInviteCode !== INVITE_CODE) {
      setBusy(false);
      setError("Invalid invite code. Please check the code and try again.");
      return;
    }

    if (password.length < 8) {
      setBusy(false);
      setError("Password must be at least 8 characters.");
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          phone: phone.trim(),
          role: "call_center_agent",
          call_center_invite_code: cleanInviteCode,
        },
      },
    });

    setBusy(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    void audit("call_center.signup.requested", cleanEmail);

    // Keep signup clean. They still need admin approval before lead access.
    try {
      await supabase.auth.signOut({ scope: "local" } as never);
    } catch {
      // noop
    }

    setMessage("Signup received. Your call centre profile is pending approval. Once approved, you can sign in.");
  };

  return (
    <div className="flex min-h-screen flex-col brand-gradient-bg">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-6 flex flex-col items-center gap-4 text-center">
            <Logo className="h-20" />
            <div>
              <h1 className="font-display text-2xl uppercase tracking-wider brand-gradient-text">
                Call Centre Signup
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a call centre agent account with an invite code.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
              <p className="font-semibold">POPIA-aware sales rule</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                Use only public school, club, academy, admin or business contact information.
                Do not collect child or athlete personal information for prospecting.
              </p>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Full name</span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base focus:border-primary focus:outline-none"
                placeholder="Agent name"
                autoComplete="name"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base focus:border-primary focus:outline-none"
                placeholder="agent@example.com"
                autoComplete="email"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base focus:border-primary focus:outline-none"
                placeholder="+27..."
                autoComplete="tel"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base focus:border-primary focus:outline-none"
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Invite code</span>
              <input
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-3 text-base focus:border-primary focus:outline-none"
                placeholder="4SPORT-CALLCENTER-2026"
                autoComplete="off"
              />
            </label>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            {message && (
              <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Creating account…" : "Create call centre account"}
            </button>

            <div className="mt-4 flex items-center justify-between text-xs">
              <Link to="/login" className="text-primary hover:underline">
                Back to sign in
              </Link>
              <button
                type="button"
                onClick={() => navigate({ to: "/login" })}
                className="text-muted-foreground hover:text-primary hover:underline"
              >
                I already have an account
              </button>
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
