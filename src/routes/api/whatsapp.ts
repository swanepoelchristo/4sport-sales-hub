import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  forwardWhatsAppToSidekick,
  verifyWhatsAppSignature,
  whatsappMessageText,
  type SalesHubWhatsAppMessage,
} from "@/lib/sidekick-intake.server";

function inferQueueType(text: string) {
  const lowered = String(text || "").toLowerCase();

  const gameDaySignals = [
    "game day",
    "match day",
    "field",
    "fixture",
    "umpire",
    "referee",
    "technical person",
    "next to the field",
  ];

  return gameDaySignals.some((signal) => lowered.includes(signal))
    ? "Game Day Ops"
    : "Support";
}

type WhatsAppContact = {
  wa_id?: string;
  profile?: { name?: string };
};

type WhatsAppValue = {
  contacts?: WhatsAppContact[];
  messages?: SalesHubWhatsAppMessage[];
  metadata?: { phone_number_id?: string };
};

function webhookValues(payload: unknown): WhatsAppValue[] {
  if (!payload || typeof payload !== "object") return [];
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return [];

  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) return [];
    return changes.flatMap((change) => {
      if (!change || typeof change !== "object") return [];
      const value = (change as { value?: unknown }).value;
      return value && typeof value === "object" ? [value as WhatsAppValue] : [];
    });
  });
}

function senderName(value: WhatsAppValue, from: string): string {
  return value.contacts?.find((contact) => contact.wa_id === from)?.profile?.name?.trim()
    || value.contacts?.[0]?.profile?.name?.trim()
    || "";
}

export const Route = createFileRoute("/api/whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);

        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (
          mode === "subscribe" &&
          token === process.env.WHATSAPP_VERIFY_TOKEN
        ) {
          return new Response(challenge, { status: 200 });
        }

        return new Response("Verification failed", { status: 403 });
      },

      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-hub-signature-256");
        if (!(await verifyWhatsAppSignature(rawBody, signature))) {
          return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
        }

        try {
          const payload = JSON.parse(rawBody) as unknown;
          const values = webhookValues(payload);
          const deliveries: Array<Promise<"accepted" | "skipped">> = [];
          let stored = 0;

          for (const value of values) {
            for (const message of value.messages ?? []) {
              if (!message.id || !message.from) continue;

              const text = whatsappMessageText(message);
              const name = senderName(value, message.from);
              const queueType = inferQueueType(text);

              const { error } = await supabaseAdmin
                .from("whatsapp_inbox")
                .insert({
                  from_number: message.from,
                  sender_name: name,
                  message_text: text,
                  raw_payload: payload,
                  category: queueType,
                  status: "New",
                });

              if (error) {
                console.error("[WhatsApp inbox persistence]", error.message);
                continue;
              }

              stored += 1;
              deliveries.push(forwardWhatsAppToSidekick({
                message,
                senderName: name,
                phoneNumberId: value.metadata?.phone_number_id,
              }));
            }
          }

          const settled = await Promise.allSettled(deliveries);
          const accepted = settled.filter(
            (result) => result.status === "fulfilled" && result.value === "accepted",
          ).length;
          const skipped = settled.filter(
            (result) => result.status === "fulfilled" && result.value === "skipped",
          ).length;
          const failed = settled.filter((result) => result.status === "rejected").length;
          if (failed) console.error(`[Sidekick intake] ${failed} delivery attempt(s) failed`);

          return Response.json({
            success: true,
            stored,
            sidekick: { accepted, skipped, failed },
          });
        } catch (error) {
          console.error("[WhatsApp webhook]", error instanceof Error ? error.message : "Unknown failure");
          return Response.json(
            { error: "Webhook failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
