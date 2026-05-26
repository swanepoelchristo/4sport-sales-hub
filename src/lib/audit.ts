// Structured audit logging — thin wrapper writing to public.activity_logs.
// Higher-level actions used across the app for the "cockpit log".
import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "login.success"
  | "login.failed"
  | "logout"
  | "lead.create" | "lead.update" | "lead.archive"
  | "meeting.create" | "meeting.update" | "meeting.archive"
  | "signup.create" | "signup.update" | "signup.archive"
  | "commission.status_change"
  | "export.csv"
  | "attachment.upload" | "attachment.delete";

export async function audit(
  action: AuditAction | string,
  detail: string,
  opts?: {
    entityType?: string;
    entityId?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    actorId?: string | null;
    actorName?: string | null;
  },
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const actor_id = opts?.actorId ?? user?.id ?? null;
    if (!actor_id) return; // RLS requires actor_id = auth.uid()
    await supabase.from("activity_logs").insert({
      actor_id,
      actor_name: opts?.actorName ?? user?.email ?? "",
      action,
      detail,
      entity_type: opts?.entityType ?? "",
      entity_id: opts?.entityId ?? null,
      old_value: opts?.oldValue ?? null,
      new_value: opts?.newValue ?? null,
    });
  } catch (e) {
    console.error("[audit]", e);
  }
}
