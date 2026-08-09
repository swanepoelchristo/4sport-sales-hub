import { createFileRoute } from "@tanstack/react-router";
import { deliverDueSidekickOutbox } from "@/lib/sidekick-outbox.server";

function authorized(request: Request): boolean {
  const expected = process.env.SIDEKICK_OUTBOX_SECRET?.trim();
  const supplied = request.headers.get("authorization");
  return Boolean(expected && supplied === `Bearer ${expected}`);
}

export const Route = createFileRoute("/api/sidekick-outbox")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const body = await request.json().catch(() => null) as { limit?: number } | null;
          const result = await deliverDueSidekickOutbox(Number(body?.limit || 10));
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("[Sidekick outbox worker]", error instanceof Error ? error.message : "Unknown failure");
          return Response.json({ error: "Outbox worker failed" }, { status: 500 });
        }
      },
    },
  },
});
