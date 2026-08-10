import { createFileRoute } from "@tanstack/react-router";
import { pollEmailMailbox, type EmailMailbox } from "@/lib/sidekick-email-intake.server";
import {
  deliverSidekickOutboxItem,
  enqueueEmailSidekickDelivery,
} from "@/lib/sidekick-outbox.server";

function authorized(request: Request): boolean {
  const expected = process.env.SIDEKICK_EMAIL_POLL_SECRET?.trim();
  const supplied = request.headers.get("authorization");
  return Boolean(expected && supplied === `Bearer ${expected}`);
}

function requestedMailboxes(value: unknown): EmailMailbox[] {
  if (!value || typeof value !== "object") return ["gmail", "afrihost"];
  const requested = (value as { mailboxes?: unknown }).mailboxes;
  if (!Array.isArray(requested)) return ["gmail", "afrihost"];
  const allowed = requested.filter((item): item is EmailMailbox => item === "gmail" || item === "afrihost");
  return [...new Set(allowed)];
}

export const Route = createFileRoute("/api/email-intake")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const body = await request.json().catch(() => null);
          const mailboxes = requestedMailboxes(body);
          const results = [];

          for (const mailbox of mailboxes) {
            const polled = await pollEmailMailbox(mailbox);
            let delivered = 0;
            let deferred = 0;
            for (const email of polled.messages) {
              const sourceEventId = await enqueueEmailSidekickDelivery(email);
              const outcome = await deliverSidekickOutboxItem(sourceEventId);
              if (outcome === "delivered") delivered += 1;
              if (outcome === "deferred") deferred += 1;
            }
            results.push({
              mailbox,
              configured: polled.configured,
              inspected: polled.inspected,
              queued: polled.messages.length,
              delivered,
              deferred,
            });
          }

          return Response.json({ ok: true, readOnly: true, results });
        } catch (error) {
          console.error("[Email intake worker]", error instanceof Error ? error.message : "Unknown failure");
          return Response.json({ error: "Email intake worker failed" }, { status: 500 });
        }
      },
    },
  },
});
