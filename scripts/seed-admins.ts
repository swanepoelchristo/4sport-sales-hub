/**
 * Seed script — creates the two initial admin accounts (Christo and Mariaan)
 * and links them to rows in the `reps` table.
 *
 * Run from your local machine (NOT in the browser):
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun run scripts/seed-admins.ts
 *
 * Requires the service-role key. Safe to run multiple times.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const ADMINS = [
  { full_name: "Christo Admin",  email: "christo@4sport.co.za",  password: "ChangeMe!2026", province: "Gauteng",      sport_focus: "Multi-sport" },
  { full_name: "Mariaan Admin",  email: "mariaan@4sport.co.za",  password: "ChangeMe!2026", province: "Western Cape", sport_focus: "Multi-sport" },
];

async function ensureAdmin(a: typeof ADMINS[number]) {
  // 1) Create or find the auth user
  let userId: string | null = null;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: a.email,
    password: a.password,
    email_confirm: true,
    user_metadata: { full_name: a.full_name, role: "admin" },
  });
  if (createErr && !/already/i.test(createErr.message)) throw createErr;
  if (created?.user) userId = created.user.id;

  if (!userId) {
    // Look up the existing user
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    userId = list.users.find((u) => u.email?.toLowerCase() === a.email.toLowerCase())?.id ?? null;
  }
  if (!userId) throw new Error(`Could not resolve user id for ${a.email}`);

  // 2) Ensure profile has admin role
  await admin.from("profiles").upsert({
    id: userId, email: a.email, full_name: a.full_name, role: "admin",
  });

  // 3) Ensure a linked rep row exists
  const { data: existingRep } = await admin
    .from("reps").select("id").eq("user_id", userId).maybeSingle();
  if (!existingRep) {
    await admin.from("reps").insert({
      user_id: userId, full_name: a.full_name, email: a.email,
      phone: "", province: a.province, sport_focus: a.sport_focus,
      role: "admin", active: true,
    });
  }

  console.log(`✓ ${a.full_name} (${a.email})`);
}

(async () => {
  for (const a of ADMINS) await ensureAdmin(a);
  console.log("Seed complete.");
})().catch((e) => { console.error(e); process.exit(1); });
