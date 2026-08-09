import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  forwardWhatsAppToSidekick,
  type SalesHubWhatsAppMessage,
} from "@/lib/sidekick-intake.server";

export type SidekickOutboxPayload = {
  message: SalesHubWhatsAppMessage;
  senderName?: string;
  phoneNumberId?: string;
};

type OutboxRow = {
  source_event_id: string;
  payload: SidekickOutboxPayload;
  attempts: number;
};

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown Sidekick delivery failure";
  return message.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]").slice(0, 300);
}

function retryAt(attempts: number): string {
  const minutes = [1, 5, 15, 60, 360, 720][Math.min(Math.max(attempts - 1, 0), 5)];
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export async function enqueueSidekickDelivery(payload: SidekickOutboxPayload): Promise<string> {
  const messageId = payload.message.id?.trim();
  if (!messageId) throw new Error("WhatsApp message id is required for Sidekick delivery");

  const sourceEventId = `sales-hub-whatsapp:${messageId}`;
  const { error } = await supabaseAdmin
    .from("sidekick_delivery_outbox")
    .upsert({
      source_event_id: sourceEventId,
      channel: "sales_hub_whatsapp",
      payload,
      status: "pending",
      next_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "source_event_id",
      ignoreDuplicates: true,
    });

  if (error) throw new Error(`Unable to queue Sidekick delivery: ${error.message}`);
  return sourceEventId;
}

export async function deliverSidekickOutboxItem(sourceEventId: string): Promise<"delivered" | "deferred" | "unavailable"> {
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("sidekick_delivery_outbox")
    .update({
      status: "delivering",
      updated_at: new Date().toISOString(),
    })
    .eq("source_event_id", sourceEventId)
    .in("status", ["pending", "delivering"])
    .lte("next_attempt_at", new Date().toISOString())
    .select("source_event_id,payload,attempts")
    .maybeSingle();

  if (claimError) throw new Error(`Unable to claim Sidekick delivery: ${claimError.message}`);
  if (!claimed) return "unavailable";

  const row = claimed as OutboxRow;
  const attempts = Number(row.attempts || 0) + 1;

  try {
    const result = await forwardWhatsAppToSidekick(row.payload);
    if (result === "skipped") {
      await supabaseAdmin
        .from("sidekick_delivery_outbox")
        .update({
          status: "pending",
          attempts,
          next_attempt_at: retryAt(attempts),
          last_error: "Sidekick intake configuration is not available",
          updated_at: new Date().toISOString(),
        })
        .eq("source_event_id", sourceEventId);
      return "deferred";
    }

    await supabaseAdmin
      .from("sidekick_delivery_outbox")
      .update({
        status: "delivered",
        attempts,
        delivered_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("source_event_id", sourceEventId);
    return "delivered";
  } catch (error) {
    const deadLetter = attempts >= 8;
    await supabaseAdmin
      .from("sidekick_delivery_outbox")
      .update({
        status: deadLetter ? "dead_letter" : "pending",
        attempts,
        next_attempt_at: retryAt(attempts),
        last_error: safeError(error),
        updated_at: new Date().toISOString(),
      })
      .eq("source_event_id", sourceEventId);
    return "deferred";
  }
}

export async function deliverDueSidekickOutbox(limit = 10): Promise<{
  selected: number;
  delivered: number;
  deferred: number;
}> {
  const boundedLimit = Math.min(Math.max(limit, 1), 25);
  const { data, error } = await supabaseAdmin
    .from("sidekick_delivery_outbox")
    .select("source_event_id")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(boundedLimit);

  if (error) throw new Error(`Unable to read Sidekick outbox: ${error.message}`);

  let delivered = 0;
  let deferred = 0;
  for (const row of data ?? []) {
    const outcome = await deliverSidekickOutboxItem(String(row.source_event_id));
    if (outcome === "delivered") delivered += 1;
    else if (outcome === "deferred") deferred += 1;
  }
  return { selected: data?.length ?? 0, delivered, deferred };
}
