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

function normalizeQueueType(category: unknown, messageText: unknown) {
  const value = String(category || "").trim();

  if (["Support", "Game Day Ops", "Billing", "General"].includes(value)) {
    return value;
  }

  return inferQueueType(String(messageText || ""));
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

        if (body?.mode === "create_support_ticket") {
          const msg = body?.message;
          if (!msg?.id) {
            return Response.json({ error: "Missing WhatsApp message" }, { status: 400 });
          }

          const queueType = normalizeQueueType(msg.category, msg.message_text);
          const title = String(msg.message_text || "WhatsApp support request").slice(0, 120);
          const description = [
            String(msg.message_text || ""),
            "",
            `WhatsApp sender: ${msg.sender_name || "Unknown"}`,
            `WhatsApp number: ${msg.from_number || "Unknown"}`,
            `WhatsApp origin detected - ${msg.id}`,
          ].join("\n");

          const { data: existingMessage, error: existingMessageError } = await supabaseAdmin
            .from("whatsapp_inbox")
            .select("linked_support_ticket_id")
            .eq("id", msg.id)
            .maybeSingle();

          if (existingMessageError) {
            console.error("[whatsapp inbox existing check]", existingMessageError);
            return Response.json({ error: existingMessageError.message }, { status: 500 });
          }

          if (existingMessage?.linked_support_ticket_id) {
            return Response.json({
              ok: true,
              reused: true,
              ticket_id: existingMessage.linked_support_ticket_id,
              queue_type: queueType,
            });
          }

          const year = new Date().getFullYear();
          const { count, error: countError } = await supabaseAdmin
            .from("support_tickets")
            .select("id", { count: "exact", head: true })
            .gte("created_at", `${year}-01-01T00:00:00.000Z`)
            .lt("created_at", `${year + 1}-01-01T00:00:00.000Z`);

          if (countError) {
            console.error("[support ticket count]", countError);
            return Response.json({ error: countError.message }, { status: 500 });
          }

          const ticketNumber = `4S-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;

          const { data: ticket, error: ticketError } = await supabaseAdmin
            .from("support_tickets")
            .insert({
              signup_id: null,
              lead_id: null,
              category: "Communication",
              severity: queueType === "Game Day Ops" ? "HIGH" : "MEDIUM",
              title,
              description,
              sla_hours: queueType === "Game Day Ops" ? 1 : 24,
              assigned_to_name: "Unassigned",
              handled_by_name: "Unassigned",
              last_updated_by_name: "System",
              queue_type: queueType,
              ticket_number: ticketNumber,
            })
            .select("id, ticket_number")
            .single();

          if (ticketError) {
            console.error("[whatsapp support ticket insert]", ticketError);
            return Response.json({ error: ticketError.message }, { status: 500 });
          }

          const { error: inboxError } = await supabaseAdmin
            .from("whatsapp_inbox")
            .update({
              category: queueType,
              status: "Assigned",
              linked_support_ticket_id: ticket.id,
              outbound_confirmation_status: "pending",
            })
            .eq("id", msg.id);

          if (inboxError) {
            console.error("[whatsapp inbox update]", inboxError);
            return Response.json({ error: inboxError.message }, { status: 500 });
          }

          await supabaseAdmin.from("support_ticket_activity").insert({
            ticket_id: ticket.id,
            action_type: "created_from_whatsapp",
            field_name: "whatsapp_message_id",
            old_value: null,
            new_value: msg.id,
            actor_name: "System",
          });

          return Response.json({
            ok: true,
            ticket_id: ticket.id,
            ticket_number: ticket.ticket_number,
            queue_type: queueType,
            outbound_confirmation_status: "pending",
          });
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
