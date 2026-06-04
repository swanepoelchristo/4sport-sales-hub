import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
        try {
          const payload = await request.json();

          const entry = payload?.entry?.[0];
          const change = entry?.changes?.[0];
          const value = change?.value;
          const message = value?.messages?.[0];

          if (!message) {
            return Response.json({ ok: true });
          }

          const from = message.from ?? "";
          const text =
            message.text?.body ??
            "[non-text message]";

          const queueType = inferQueueType(text);

          await supabaseAdmin
            .from("whatsapp_inbox")
            .insert({
              from_number: from,
              sender_name: value?.contacts?.[0]?.profile?.name ?? "",
              message_text: text,
              raw_payload: payload,
              category: queueType,
              status: "New",
            });

          return Response.json({ success: true });
        } catch (err) {
          console.error(err);
          return Response.json(
            { error: "Webhook failed" },
            { status: 500 }
          );
        }
      },
    },
  },
});
