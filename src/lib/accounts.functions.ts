import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const roleSchema = z.enum(["admin", "sales_rep"]);

async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Not authorised");
}

async function findAuthUser(email: string) {
  const needle = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === needle);
    if (found) return found;
    if (data.users.length < 100) return null;
  }
  return null;
}

async function upsertLinkedRows(input: {
  userId: string; email: string; fullName: string; role: "admin" | "sales_rep";
  phone?: string; province?: string; region?: string; sportFocus?: string; active?: boolean;
}) {
  const { userId, email, fullName, role } = input;
  const [{ error: profileError }, { error: roleDeleteError }] = await Promise.all([
    supabaseAdmin.from("profiles").upsert({ id: userId, email, full_name: fullName }),
    supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
  ]);
  if (profileError) throw profileError;
  if (roleDeleteError) throw roleDeleteError;
  const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
  if (roleError) throw roleError;

  const { data: rep } = await supabaseAdmin.from("reps").select("id").eq("user_id", userId).maybeSingle();
  const row = {
    user_id: userId, profile_id: userId, full_name: fullName, email,
    phone: input.phone ?? "", province: input.province ?? "", region: input.region ?? "",
    sport_focus: input.sportFocus ?? "Multi-sport", role, active: input.active ?? true,
    invitation_status: "accepted" as const,
  };
  const { error: repError } = rep
    ? await supabaseAdmin.from("reps").update(row).eq("id", rep.id)
    : await supabaseAdmin.from("reps").insert(row);
  if (repError) throw repError;
}

export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    sendInvite: z.boolean().optional().default(true),
  }).parse(input))
  .handler(async ({ data }) => {
    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw countError;
    if ((count ?? 0) > 0) return { ok: true, message: "Admin already exists." };

    const email = "swanepoelchristo00@gmail.com";
    const existing = await findAuthUser(email);
    const user = existing ?? (data.sendInvite
      ? (await supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: { full_name: "Christo", role: "admin" } })).data.user
      : null);
    if (!user) throw new Error("Could not create or invite first admin.");
    await upsertLinkedRows({ userId: user.id, email, fullName: "Christo", role: "admin" });
    return { ok: true, message: "First admin is linked and has admin role." };
  });

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("reps")
      .select("*")
      .eq("archived", false)
      .order("full_name");
    if (error) throw error;
    return data ?? [];
  });

export const inviteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    fullName: z.string().min(1).max(120),
    email: z.string().email().max(255),
    phone: z.string().max(60).optional().default(""),
    role: roleSchema,
    province: z.string().max(80).optional().default(""),
    region: z.string().max(80).optional().default(""),
    sportFocus: z.string().max(80).optional().default("Multi-sport"),
    active: z.boolean().optional().default(true),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const email = data.email.toLowerCase();
    let user = await findAuthUser(email);
    if (!user) {
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: data.fullName, role: data.role },
      });
      if (error) throw error;
      user = invited.user;
    } else {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { full_name: data.fullName, role: data.role },
      });
      if (error) throw error;
    }
    await upsertLinkedRows({ userId: user.id, email, fullName: data.fullName, role: data.role, phone: data.phone, province: data.province, region: data.region, sportFocus: data.sportFocus, active: data.active });
    await supabaseAdmin.from("account_invitations").upsert({ email, full_name: data.fullName, role: data.role, invited_by: context.userId, status: "pending", last_sent_at: new Date().toISOString() }, { onConflict: "email" });
    await supabaseAdmin.from("activity_logs").insert({ actor_id: context.userId, actor_name: context.claims.email ?? "Admin", action: "account.invite", detail: `Invited ${data.fullName} (${email})`, entity_type: "account" });
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ email: z.string().email().max(255) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const email = data.email.toLowerCase();
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);
    if (error) throw error;
    await supabaseAdmin.from("reps").update({ password_reset_sent_at: new Date().toISOString() }).eq("email", email);
    await supabaseAdmin.from("activity_logs").insert({ actor_id: context.userId, actor_name: context.claims.email ?? "Admin", action: "account.password_reset", detail: `Password reset sent to ${email}`, entity_type: "account" });
    return { ok: true };
  });

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ email: z.string().email().max(255) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const email = data.email.toLowerCase();
    const existing = await findAuthUser(email);
    if (existing && existing.last_sign_in_at) {
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
      if (error && !/already.*registered|exists/i.test(error.message)) throw error;
    }
    await supabaseAdmin.from("reps").update({ last_invite_sent_at: new Date().toISOString() }).eq("email", email);
    await supabaseAdmin.from("activity_logs").insert({ actor_id: context.userId, actor_name: context.claims.email ?? "Admin", action: "account.invite_resent", detail: `Re-sent invite to ${email}`, entity_type: "account" });
    return { ok: true };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    repId: z.string().uuid(),
    fullName: z.string().min(1).max(120).optional(),
    phone: z.string().max(60).optional(),
    role: roleSchema.optional(),
    province: z.string().max(80).optional(),
    region: z.string().max(80).optional(),
    sportFocus: z.string().max(80).optional(),
    active: z.boolean().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { data: rep, error: repErr } = await supabaseAdmin.from("reps").select("*").eq("id", data.repId).single();
    if (repErr || !rep) throw repErr ?? new Error("Rep not found");

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.fullName !== undefined) update.full_name = data.fullName;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.role !== undefined) update.role = data.role;
    if (data.province !== undefined) update.province = data.province;
    if (data.region !== undefined) update.region = data.region;
    if (data.sportFocus !== undefined) update.sport_focus = data.sportFocus;
    if (data.active !== undefined) update.active = data.active;

    const { error: upErr } = await supabaseAdmin.from("reps").update(update as never).eq("id", data.repId);
    if (upErr) throw upErr;

    if (data.role && rep.user_id && data.role !== rep.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", rep.user_id);
      await supabaseAdmin.from("user_roles").insert({ user_id: rep.user_id, role: data.role });
      await supabaseAdmin.from("activity_logs").insert({ actor_id: context.userId, actor_name: context.claims.email ?? "Admin", action: "account.role_assigned", detail: `${rep.email} -> ${data.role}`, entity_type: "account" });
    }
    if (data.active === false && rep.active) {
      await supabaseAdmin.from("activity_logs").insert({ actor_id: context.userId, actor_name: context.claims.email ?? "Admin", action: "account.deactivated", detail: `Deactivated ${rep.email}`, entity_type: "account" });
    } else if (data.active === true && !rep.active) {
      await supabaseAdmin.from("activity_logs").insert({ actor_id: context.userId, actor_name: context.claims.email ?? "Admin", action: "account.activated", detail: `Activated ${rep.email}`, entity_type: "account" });
    }
    return { ok: true };
  });