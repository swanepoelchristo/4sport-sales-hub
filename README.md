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

---

## Docker

Build and run with Docker Compose:

```bash
cp .env.example .env   # fill in Supabase URL + keys
docker compose up -d --build
```

The container exposes port `3000`. Front it with the nginx config in
`deploy/nginx.conf.example` for TLS termination on your Ubuntu VPS.

## Ubuntu VPS (manual)

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
curl -fsSL https://bun.sh/install | bash
git clone <your-repo-url> /opt/4sport && cd /opt/4sport
cp .env.example .env && nano .env
bun install && bun run build
# Run under a process manager (systemd / pm2) pointing at:
#   bun run .output/server/index.mjs
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/4sport
sudo ln -s /etc/nginx/sites-available/4sport /etc/nginx/sites-enabled/4sport
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d dashboard.4sport.co.za
```

## Coolify

Point Coolify at the GitHub repo, choose **Dockerfile** as the build pack, and
set the env vars from `.env.example` in the Coolify UI. Coolify handles TLS
and reverse proxy automatically — the nginx example is only for bare VPS.

---

## Manual Test Before Going Live

Run this checklist on the live URL before handing the dashboard to the team.
Admins also have an automated **System Check** page at `/system-check` that
verifies the backend (connection, profile load, role, RLS, CRUD, commission
calc, activity log). Run it first, then walk through the manual steps below.

All records created during testing must be clearly prefixed with `[TEST]`
in the `org_name` or `notes` field, and removed afterwards. Do **not** seed
fake data into the live UI.

### 1. Christo admin login
- Sign in as `christo@4sport.co.za`.
- Confirm header shows role `admin` and the **Reps**, **Activity**, and
  **System** nav items are visible.
- Open `/system-check` → click **Run all checks** → all 11 checks must pass.

### 2. Mariaan admin login
- Sign out, sign in as `mariaan@4sport.co.za`.
- Repeat the System Check run; all 11 must pass.

### 3. Sales rep login
- Sign in as a seeded sales rep account.
- Confirm header shows role `sales_rep`; **Reps / Activity / System** are
  hidden.
- Dashboard KPIs and lead list must only show records assigned to this rep.

### 4. Create lead (as sales rep)
- Go to **Leads → New Lead**, create `[TEST] Greenwood High`, assign to self.
- Lead appears in the rep's list immediately.

### 5. Assign lead (as admin)
- Sign back in as Christo, open `[TEST] Greenwood High`, reassign to a
  different rep, save.
- Original rep can no longer see it; new rep can.

### 6. Log meeting
- As the assigned rep, open the lead → **Log meeting** → save with type,
  outcome notes and next action.
- Meeting appears under **Meetings** for that rep and under the lead.

### 7. Mark school paid
- Admin opens **Signups**, creates a signup row for the test lead, sets
  `paid = true`, `payment_date`, `active_teams = 3`, `paying_users_active`.

### 8. Confirm commission qualification
- On the same signup, confirm the **Qualified** badge is green and the
  payout shows **R500** for `1st year`.
- Lower `active_teams` to 2 → qualification flips to false and payout R0.
- Restore values.

### 9. Confirm rep cannot see another rep's lead
- Sign in as a second sales rep with no leads assigned.
- `/leads` is empty; opening the previous lead's URL directly returns a
  not-found / empty state (RLS blocks the read at the database level).

### 10. Clean up
- As admin, delete every `[TEST]` lead, meeting and signup.
- Re-run `/system-check` — Activity log should record the cleanup actions.



## Phase 4 — Operational Hardening

### Backups
- Lovable Cloud (Supabase) runs automatic daily backups; for self-hosted production take a manual snapshot before each deploy: `pg_dump "$SUPABASE_DB_URL" > backup-$(date +%F).sql`.
- Store backups off-server (S3, Backblaze, etc.). Retain 30 days minimum.
- Storage bucket `lead-attachments` is private — back it up with `rclone sync` or the Supabase storage API.

### Docker update procedure
```
git pull
docker compose pull
docker compose up -d --build
docker compose logs -f --tail=100 web
```

### Ubuntu update procedure
```
sudo apt update && sudo apt upgrade -y
sudo certbot renew --quiet
sudo systemctl restart 4sport-dashboard nginx
```

### Production deployment checklist
- [ ] `.env` populated with real `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Admin seed script run (`bun scripts/seed-admins.ts`)
- [ ] `/system-check` shows all green when logged in as admin
- [ ] HTTPS via Let's Encrypt active and auto-renewing
- [ ] Database backup job scheduled
- [ ] Storage bucket backup scheduled
- [ ] Nginx reverse proxy active, port 3000 not exposed publicly
- [ ] At least one real sales rep account created and tested

### Operational features added in Phase 4
- Dashboard notifications (follow-ups due today, overdue meetings, awaiting payment, commission to pay out)
- Admin **Performance** page with per-rep KPIs, conversion %, and province breakdown
- CSV export (admin) on Leads + Performance
- File attachments per lead (PDFs, photos, agreements, quotes) — stored in private `lead-attachments` bucket
- Timeline per lead (notes, meetings, signups, activity)
- Soft-delete: all "delete" actions archive rows (`archived=true`, `deleted_at`, `deleted_by`); records are never lost
- Cockpit audit logging via `src/lib/audit.ts` (login.success, exports, attachment uploads, etc.)
- Auto sign-out after 30 minutes of inactivity (`IdleTimer`)
- Future-proofing scaffolds: `src/lib/notifications/` (WhatsApp/email channels) and `src/lib/workflows/` (onboarding + commission approval stages)
