import { supabaseAdmin } from "@/integrations/supabase/client.server";
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
  sizeBytes?: number;
  downloadUrl?: string;
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

const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "text/plain",
  "audio/mpeg", "audio/ogg", "audio/wav",
  "video/mp4", "video/webm",
]);

function safeFileName(value: string | undefined, mediaId: string, mimeType: string): string {
  const extension = mimeType === "image/jpeg" ? "jpg"
    : mimeType === "image/png" ? "png"
      : mimeType === "image/webp" ? "webp"
        : mimeType === "image/gif" ? "gif"
          : mimeType === "application/pdf" ? "pdf"
            : mimeType === "audio/ogg" ? "ogg"
              : mimeType === "audio/mpeg" ? "mp3"
                : mimeType === "video/mp4" ? "mp4"
                  : "bin";
  const cleaned = value?.split(/[\\/]/).pop()?.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 120);
  return cleaned || `${mediaId}.${extension}`;
}

async function persistMediaEvidence(message: SalesHubWhatsAppMessage): Promise<IntakeAttachment[]> {
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
  const attachment: IntakeAttachment = {
    sourceId: media.id,
    kind,
    mimeType: media.mime_type,
    fileName: media.filename,
  };

  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const version = process.env.WHATSAPP_GRAPH_API_VERSION?.trim();
  if (!token || !version) return [attachment];

  const metadataResponse = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(media.id)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!metadataResponse.ok) throw new Error(`WhatsApp media metadata returned ${metadataResponse.status}`);
  const metadata = await metadataResponse.json() as {
    url?: string;
    mime_type?: string;
    file_size?: number;
  };
  if (!metadata.url) throw new Error("WhatsApp media URL was not returned");

  const mimeType = metadata.mime_type || media.mime_type || "application/octet-stream";
  const claimedSize = Number(metadata.file_size || 0);
  if (!ALLOWED_MEDIA_TYPES.has(mimeType)) throw new Error(`WhatsApp media type is not allowed: ${mimeType}`);
  if (claimedSize > 25_000_000) throw new Error("WhatsApp media exceeds the 25 MB evidence limit");

  const mediaUrl = new URL(metadata.url);
  if (mediaUrl.protocol !== "https:") throw new Error("WhatsApp media URL must use HTTPS");

  const download = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!download.ok) throw new Error(`WhatsApp media download returned ${download.status}`);
  const bytes = new Uint8Array(await download.arrayBuffer());
  if (bytes.byteLength > 25_000_000) throw new Error("WhatsApp media exceeds the 25 MB evidence limit");

  const fileName = safeFileName(media.filename, media.id, mimeType);
  const date = new Date().toISOString().slice(0, 10);
  const storagePath = `whatsapp/${date}/${media.id}/${fileName}`;
  const bucket = supabaseAdmin.storage.from("sidekick-evidence");
  const { error: uploadError } = await bucket.upload(storagePath, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) {
    throw new Error(`Unable to store WhatsApp evidence: ${uploadError.message}`);
  }

  const { data: signed, error: signedError } = await bucket.createSignedUrl(storagePath, 15 * 60);
  if (signedError || !signed?.signedUrl) throw new Error("Unable to create private evidence reference");

  return [{
    ...attachment,
    mimeType,
    fileName,
    sizeBytes: bytes.byteLength,
    downloadUrl: signed.signedUrl,
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
      attachments: await persistMediaEvidence(input.message),
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
