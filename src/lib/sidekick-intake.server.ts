type WhatsAppMedia = {
  id?: string;
  mime_type?: string;
  filename?: string;
  caption?: string;
};

export type SalesHubWhatsAppMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: WhatsAppMedia;
  document?: WhatsAppMedia;
  audio?: WhatsAppMedia;
  video?: WhatsAppMedia;
  sticker?: WhatsAppMedia;
};

type IntakeAttachment = {
  sourceId: string;
  kind: "image" | "document" | "audio" | "video" | "other";
  mimeType?: string;
  fileName?: string;
};

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function verifyWhatsAppSignature(rawBody: string, suppliedSignature: string | null): Promise<boolean> {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!secret || !suppliedSignature?.startsWith("sha256=")) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return constantTimeEqual(`sha256=${bytesToHex(digest)}`, suppliedSignature.trim().toLowerCase());
}

function mediaFor(message: SalesHubWhatsAppMessage): WhatsAppMedia | undefined {
  if (message.type === "image") return message.image;
  if (message.type === "document") return message.document;
  if (message.type === "audio") return message.audio;
  if (message.type === "video") return message.video;
  if (message.type === "sticker") return message.sticker;
  return undefined;
}

export function whatsappMessageText(message: SalesHubWhatsAppMessage): string {
  if (message.text?.body?.trim()) return message.text.body.trim();
  const media = mediaFor(message);
  if (media?.caption?.trim()) return media.caption.trim();
  return `[${message.type || "non-text"} message received]`;
}

function intakeAttachments(message: SalesHubWhatsAppMessage): IntakeAttachment[] {
  const media = mediaFor(message);
  if (!media?.id) return [];
  const kind = message.type === "image"
    ? "image"
    : message.type === "document"
      ? "document"
      : message.type === "audio"
        ? "audio"
        : message.type === "video"
          ? "video"
          : "other";
  return [{
    sourceId: media.id,
    kind,
    mimeType: media.mime_type,
    fileName: media.filename,
  }];
}

export async function forwardWhatsAppToSidekick(input: {
  message: SalesHubWhatsAppMessage;
  senderName?: string;
  phoneNumberId?: string;
}): Promise<"accepted" | "skipped"> {
  const baseUrl = process.env.SIDEKICK_INTAKE_URL?.trim();
  const apiKey = process.env.SIDEKICK_INTAKE_API_KEY?.trim();
  if (!baseUrl || !apiKey) return "skipped";

  const messageId = input.message.id?.trim();
  const sender = input.message.from?.trim();
  if (!messageId || !sender) throw new Error("WhatsApp message id and sender are required");

  const occurredAt = /^\d+$/.test(input.message.timestamp ?? "")
    ? new Date(Number(input.message.timestamp) * 1_000).toISOString()
    : new Date().toISOString();

  const response = await fetch(new URL("/api/intake", baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "whatsapp",
      sourceEventId: `sales-hub-whatsapp:${messageId}`,
      occurredAt,
      sender: {
        sourceId: sender,
        displayName: input.senderName?.trim() || undefined,
        address: sender,
      },
      message: whatsappMessageText(input.message),
      attachments: intakeAttachments(input.message),
      hints: {
        project: "4SPORT Sales Hub",
      },
      metadata: {
        intakeChannel: "sales_hub_whatsapp",
        whatsappMessageId: messageId,
        whatsappMessageType: input.message.type || "unknown",
        phoneNumberId: input.phoneNumberId || null,
      },
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok && response.status !== 409) {
    throw new Error(`Sidekick intake returned ${response.status}`);
  }
  return "accepted";
}
