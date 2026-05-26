import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapFirstAdmin } from "@/lib/accounts.functions";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/bootstrap-admin")({ component: BootstrapAdminPage });

function BootstrapAdminPage() {
  const fn = useServerFn(bootstrapFirstAdmin);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await fn({ data: { sendInvite: true } });
      setMsg(r.message);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col brand-gradient-bg">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-4">
            <Logo className="h-20" />
            <h1 className="font-display text-2xl uppercase tracking-wider brand-gradient-text">First-time setup</h1>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <p className="text-sm text-muted-foreground">
              Creates the first administrator account (<code>swanepoelchristo00@gmail.com</code>, Christo) and
              sends an invitation email so they can set a password. Safe to run multiple times — it does nothing
              if an admin already exists.
            </p>
            {msg && <p className="mt-3 text-sm text-foreground">{msg}</p>}
            {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
            <button onClick={run} disabled={busy}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {busy ? "Working…" : "Bootstrap first admin"}
            </button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link to="/login" className="text-primary">Back to sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
