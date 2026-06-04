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


export const Route = createFileRoute("/api/whatsapp-inbox")({
  server: {
    handlers: {
      GET: async () => {
        const { data, error } = await supabaseAdmin
          .from("whatsapp_inbox")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error(error);
          return Response.json([]);
        }

        return Response.json(data);
      },

      POST: async ({ request }) => {
        const body = await request.json();

        if (body?.mode === "create_test") {
          const messageText = body.message_text || "Test WhatsApp message";
          const queueType = inferQueueType(messageText);

          const { error } = await supabaseAdmin
            .from("whatsapp_inbox")
            .insert({
              from_number: body.from_number || "27820000000",
              sender_name: body.sender_name || "Manual Test",
              message_text: messageText,
              category: queueType,
              status: "New",
            });

          if (error) return Response.json({ error: error.message }, { status: 500 });
          return Response.json({ ok: true });
        }

        const id = body?.id;
        const patch = body?.patch ?? {};
        if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

        const clean = Object.fromEntries(
          Object.entries({
            category: patch.category,
            status: patch.status,
            notes: patch.notes,
          }).filter(([, value]) => value !== undefined)
        );

        const { error } = await supabaseAdmin
          .from("whatsapp_inbox")
          .update(clean)
          .eq("id", id);

        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
