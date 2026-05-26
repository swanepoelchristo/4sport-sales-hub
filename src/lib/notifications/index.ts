// Future-proofing: notification channel interfaces.
// Not wired to any transport yet. Implementations would live in
// src/lib/notifications/whatsapp.ts and src/lib/notifications/email.ts,
// likely backed by a TanStack server function calling a third-party API.

export type NotificationKind =
  | "follow_up_due"
  | "meeting_reminder"
  | "payment_outstanding"
  | "commission_ready";

export interface NotificationPayload {
  kind: NotificationKind;
  to: string;            // phone or email
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationChannel {
  name: "whatsapp" | "email";
  send(payload: NotificationPayload): Promise<{ ok: boolean; id?: string; error?: string }>;
}

// Placeholder no-op channel — replace with real provider in Phase 5+.
export const noopChannel: NotificationChannel = {
  name: "email",
  async send() { return { ok: false, error: "not_configured" }; },
};
