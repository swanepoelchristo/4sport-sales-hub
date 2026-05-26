# 4SPORT Sales Rep Dashboard

Mobile-friendly dashboard for the 4SPORT sales team — leads, meetings, signups,
commissions, and activity logs. Built with React + Vite + TanStack Start and
backed by Supabase (Postgres + Auth + RLS).

© 2026 4SPORT. All rights reserved. Created by Milk Box AI.

---

## Stack

- React 19 + TypeScript + Vite + TanStack Router/Start
- Tailwind CSS
- Supabase (Postgres, Auth, Row-Level Security)

## Local development

```bash
bun install
bun run dev
```

The app expects `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in
`.env`. When using Lovable Cloud these are set automatically. For self-hosted
Supabase, copy `.env.example` to `.env` and fill in the values.

## Self-hosting on Ubuntu

1. **Provision a Supabase project** (managed or self-hosted on the same Ubuntu
   server via Docker). Copy the project URL, anon/publishable key, and
   service-role key.

2. **Apply the schema.** All tables, enums, triggers, and RLS policies live in
   `supabase/migrations/`. Apply them with:
   ```bash
   # via Supabase CLI (recommended)
   supabase db push
   # or paste each migration into the Supabase SQL editor
   ```

3. **Seed the admin accounts.** From your machine (uses the service-role key):
   ```bash
   SUPABASE_URL=https://YOUR-REF.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
   bun run scripts/seed-admins.ts
   ```
   This creates `christo@4sport.co.za` and `mariaan@4sport.co.za` (password
   `ChangeMe!2026` — change immediately after first login). It also inserts
   linked rows in `reps`.

4. **Configure environment variables** on the server:
   ```bash
   cp .env.example .env
   # edit VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
   ```

5. **Build and serve.**
   ```bash
   bun install
   bun run build
   # serve the build output behind nginx, or run the Node server:
   bun run start
   ```

6. **Adding sales reps.** An admin signs in, opens **Rep management**, and
   creates a new rep row. To let that rep log in, also create their auth
   account in the Supabase dashboard (Authentication → Users → Invite) and
   set the `reps.user_id` column to the new auth user's ID. The profile row
   is created automatically on first sign-in.

## Roles & access

| Role       | Capabilities                                                                 |
|------------|-------------------------------------------------------------------------------|
| `admin`    | Full CRUD across reps, leads, meetings, signups, commissions, activity logs.  |
| `sales_rep`| Can only view/edit leads, meetings, and signups assigned to themselves.       |

Row-Level Security policies enforce these rules at the database level — the
front-end UI also scopes the queries, but RLS is the source of truth.

## Commission rules

A signup qualifies when:
- The annual licence fee (R2,500) is paid, **and**
- The school has **≥3** active teams, **and**
- Paying users are active.

Annual payout per year of consecutive activity: **R500 / R300 / R200 / R100 / R50**.

The calculation lives in `src/lib/types.ts` and reads directly from the real
`signups` row fields.

## Activity log

Every create / update / status change writes a row to `activity_logs` with the
actor, action, entity type/id, and detail. Admins see the full log under the
**Activity** tab.

## Project layout

```
src/
  routes/         # File-based routes (TanStack Router)
  components/     # Shared UI (AppLayout, Logo, ui-bits)
  lib/
    store.tsx     # Supabase-backed store (auth + data)
    types.ts      # Domain types + commission rules
  integrations/
    supabase/     # Auto-generated client (do not edit)
supabase/
  migrations/     # SQL schema + RLS
scripts/
  seed-admins.ts  # One-time admin seeding script
```
