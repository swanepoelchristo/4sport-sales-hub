import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { getAuthEvents, subscribeAuthEvents, type AuthDebugEntry } from "@/lib/auth-debug";

export const Route = createFileRoute("/auth-debug")({ component: AuthDebugPage });

function AuthDebugPage() {
  const { user, loading } = useStore();
  const navigate = useNavigate();
  const [events, setEvents] = useState<AuthDebugEntry[]>(getAuthEvents());
  const [session, setSession] = useState<{
    exists: boolean;
    userId: string | null;
    email: string | null;
    expiresAt: number | null;
  }>({ exists: false, userId: null, email: null, expiresAt: null });

  useEffect(() => {
    const unsub = subscribeAuthEvents(() => setEvents(getAuthEvents()));
    return unsub;
  }, []);

  useEffect(() => {
    let on = true;
    const refresh = async () => {
      const { data } = await supabase.auth.getSession();
      if (!on) return;
      setSession({
        exists: !!data.session,
        userId: data.session?.user?.id ?? null,
        email: data.session?.user?.email ?? null,
        expiresAt: data.session?.expires_at ?? null,
      });
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => { on = false; clearInterval(id); };
  }, []);

  // Gate: must be admin (after store finished loading).
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      navigate({ to: "/login", replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user || user.role !== "admin") return null;

  const hostname = typeof window !== "undefined" ? window.location.hostname : "—";
  const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : "—";
  const expIso = session.expiresAt ? new Date(session.expiresAt * 1000).toISOString() : null;

  return (
    <div className="min-h-screen brand-gradient-bg p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl uppercase tracking-wider brand-gradient-text">Auth Debug</h1>
          <Link to="/dashboard" className="text-xs text-primary hover:underline">← Back</Link>
        </div>

        <section className="rounded-2xl border border-border bg-card p-4 text-sm">
          <h2 className="mb-3 font-semibold">Session</h2>
          <Row k="exists" v={String(session.exists)} />
          <Row k="user id" v={session.userId ?? "—"} />
          <Row k="email" v={session.email ?? "—"} />
          <Row k="role" v={user.role} />
          <Row k="access token expiry" v={expIso ?? "—"} />
          <Row k="hostname" v={hostname} />
          <Row k="recovery redirect" v={redirectUrl} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 text-sm">
          <h2 className="mb-3 font-semibold">Auth event history ({events.length})</h2>
          {events.length === 0 ? (
            <p className="text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="space-y-1 font-mono text-xs">
              {events.map((e, i) => (
                <li key={i} className="border-b border-border/40 py-1">
                  <span className="text-muted-foreground">{e.at}</span>{" "}
                  <span className="font-semibold">{e.event}</span>{" "}
                  <span>session={String(e.hasSession)}</span>{" "}
                  {e.userId && <span>uid={e.userId.slice(0, 8)}…</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-1">
      <span className="text-muted-foreground">{k}</span>
      <span className="break-all text-right font-mono text-xs">{v}</span>
    </div>
  );
}
