// Lightweight in-memory ring buffer for Supabase auth events.
// Safe: never stores tokens, refresh tokens, or passwords.
export type AuthDebugEntry = {
  at: string;
  event: string;
  hasSession: boolean;
  userId: string | null;
  email: string | null;
  expiresAt: number | null;
};

const MAX = 50;
const buffer: AuthDebugEntry[] = [];
const listeners = new Set<() => void>();

export function pushAuthEvent(event: string, session: { user?: { id: string; email?: string | null } | null; expires_at?: number | null } | null) {
  const entry: AuthDebugEntry = {
    at: new Date().toISOString(),
    event,
    hasSession: !!session,
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
    expiresAt: session?.expires_at ?? null,
  };
  buffer.unshift(entry);
  if (buffer.length > MAX) buffer.length = MAX;
  // Safe console log — no tokens.
  // eslint-disable-next-line no-console
  console.log("[auth]", event, { hasSession: entry.hasSession, userId: entry.userId, expiresAt: entry.expiresAt });
  listeners.forEach((l) => { try { l(); } catch { /* noop */ } });
}

export function getAuthEvents(): AuthDebugEntry[] {
  return buffer.slice();
}

export function subscribeAuthEvents(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
