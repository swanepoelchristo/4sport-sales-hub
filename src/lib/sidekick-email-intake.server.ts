import { createHash } from "node:crypto";
import { ImapFlow } from "imapflow";
import { simpleParser, type Attachment, type ParsedMail } from "mailparser";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type EmailMailbox = "gmail" | "afrihost";

type IntakeAttachment = {
  sourceId: string;
  kind: "image" | "document" | "audio" | "video" | "other";
  mimeType?: string;
  fileName?: string;
  sizeBytes?: number;
  downloadUrl?: string;
};

export type SalesHubEmailMessage = {
  sourceEventId: string;
  mailbox: EmailMailbox;
  messageId: string;
  occurredAt: string;
  fromAddress: string;
  fromName?: string;
  toAddresses: string[];
  subject: string;
  text: string;
  attachments: IntakeAttachment[];
};

type MailboxConfig = {
  mailbox: EmailMailbox;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
};

const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "text/plain",
  "audio/mpeg", "audio/ogg", "audio/wav",
  "video/mp4", "video/webm",
]);

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function mailboxConfig(mailbox: EmailMailbox): MailboxConfig | null {
  const prefix = mailbox === "gmail" ? "GMAIL_IMAP" : "AFRIHOST_IMAP";
  const host = env(`${prefix}_HOST`);
  const user = env(`${prefix}_USER`);
  const password = env(`${prefix}_PASSWORD`);
  if (!host || !user || !password) return null;

  const port = Number(env(`${prefix}_PORT`) || 993);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${prefix}_PORT is invalid`);
  }
  return {
    mailbox,
    host,
    port,
    secure: env(`${prefix}_SECURE`).toLowerCase() !== "false",
    user,
    password,
  };
}

function cleanFileName(value: string | undefined, fallback: string): string {
  return value?.split(/[\\/]/).pop()?.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 120) || fallback;
}

function attachmentKind(mimeType: string): IntakeAttachment["kind"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf" || mimeType === "text/plain") return "document";
  return "other";
}

async function persistAttachments(
  mailbox: EmailMailbox,
  eventHash: string,
  attachments: Attachment[],
): Promise<IntakeAttachment[]> {
  const result: IntakeAttachment[] = [];
  const bucket = supabaseAdmin.storage.from("sidekick-evidence");
  const date = new Date().toISOString().slice(0, 10);

  for (let index = 0; index < Math.min(attachments.length, 10); index += 1) {
    const attachment = attachments[index];
    const mimeType = attachment.contentType || "application/octet-stream";
    const sizeBytes = attachment.content?.byteLength || 0;
    const sourceId = attachment.checksum || `${eventHash}-${index + 1}`;
    const fileName = cleanFileName(attachment.filename, `attachment-${index + 1}`);
    const metadata: IntakeAttachment = {
      sourceId,
      kind: attachmentKind(mimeType),
      mimeType,
      fileName,
      sizeBytes,
    };

    if (!ALLOWED_MEDIA_TYPES.has(mimeType) || sizeBytes <= 0 || sizeBytes > 25_000_000) {
      result.push(metadata);
      continue;
    }

    const storagePath = `email/${mailbox}/${date}/${eventHash}/${index + 1}-${fileName}`;
    const { error: uploadError } = await bucket.upload(storagePath, attachment.content, {
      contentType: mimeType,
      upsert: false,
    });
    if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) {
      throw new Error(`Unable to store email evidence: ${uploadError.message}`);
    }

    const { data: signed, error: signedError } = await bucket.createSignedUrl(storagePath, 15 * 60);
    if (signedError || !signed?.signedUrl) throw new Error("Unable to create private email evidence reference");
    result.push({ ...metadata, downloadUrl: signed.signedUrl });
  }
  return result;
}

function firstAddress(parsed: ParsedMail): { address: string; name?: string } {
  const value = parsed.from?.value?.[0];
  return {
    address: value?.address?.trim() || "unknown",
    name: value?.name?.trim() || undefined,
  };
}

function addressList(parsed: ParsedMail): string[] {
  const values = Array.isArray(parsed.to) ? parsed.to.flatMap((item) => item.value) : parsed.to?.value || [];
  return values.map((item) => item.address?.trim()).filter((value): value is string => Boolean(value));
}

async function normalizeEmail(mailbox: EmailMailbox, parsed: ParsedMail, fallbackId: string): Promise<SalesHubEmailMessage> {
  const messageId = parsed.messageId?.trim() || fallbackId;
  const eventHash = createHash("sha256").update(`${mailbox}:${messageId}`).digest("hex");
  const sender = firstAddress(parsed);
  const text = (parsed.text || "[Email contains no plain-text body]").trim().slice(0, 25_000);
  return {
    sourceEventId: `sales-hub-email:${mailbox}:${eventHash}`,
    mailbox,
    messageId,
    occurredAt: (parsed.date || new Date()).toISOString(),
    fromAddress: sender.address,
    fromName: sender.name,
    toAddresses: addressList(parsed),
    subject: (parsed.subject || "(no subject)").trim().slice(0, 500),
    text,
    attachments: await persistAttachments(mailbox, eventHash, parsed.attachments || []),
  };
}

export async function pollEmailMailbox(mailbox: EmailMailbox): Promise<{
  configured: boolean;
  inspected: number;
  messages: SalesHubEmailMessage[];
}> {
  const config = mailboxConfig(mailbox);
  if (!config) return { configured: false, inspected: 0, messages: [] };

  const lookbackHours = Math.min(Math.max(Number(env("EMAIL_INTAKE_LOOKBACK_HOURS") || 24), 1), 168);
  const limit = Math.min(Math.max(Number(env("EMAIL_INTAKE_MAX_MESSAGES") || 20), 1), 50);
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    logger: false,
    socketTimeout: 20_000,
  });

  const messages: SalesHubEmailMessage[] = [];
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1_000);
      const found = await client.search({ since }, { uid: true });
      const uids = Array.isArray(found) ? found.slice(-limit) : [];
      for (const uid of uids) {
        const fetched = await client.fetchOne(uid, { source: true, uid: true }, { uid: true });
        if (!fetched || !fetched.source) continue;
        const parsed = await simpleParser(fetched.source);
        messages.push(await normalizeEmail(mailbox, parsed, `${config.user}:${uid}`));
      }
      return { configured: true, inspected: uids.length, messages };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function forwardEmailToSidekick(email: SalesHubEmailMessage): Promise<"accepted" | "skipped"> {
  const baseUrl = env("SIDEKICK_INTAKE_URL");
  const apiKey = env("SIDEKICK_INTAKE_API_KEY");
  if (!baseUrl || !apiKey) return "skipped";

  const response = await fetch(new URL("/api/intake", baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: email.mailbox === "gmail" ? "gmail" : "afrihost_email",
      sourceEventId: email.sourceEventId,
      occurredAt: email.occurredAt,
      sender: {
        sourceId: email.fromAddress,
        displayName: email.fromName,
        address: email.fromAddress,
      },
      message: `Subject: ${email.subject}\n\n${email.text}`,
      attachments: email.attachments,
      hints: { project: "4SPORT Sales Hub" },
      metadata: {
        intakeChannel: email.mailbox === "gmail" ? "sales_hub_gmail" : "sales_hub_afrihost",
        mailbox: email.mailbox,
        messageId: email.messageId,
        to: email.toAddresses.slice(0, 20).join(", "),
      },
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok && response.status !== 409) {
    throw new Error(`Sidekick intake returned ${response.status}`);
  }
  return "accepted";
}
