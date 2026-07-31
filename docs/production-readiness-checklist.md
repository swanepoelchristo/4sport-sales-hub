# 4SPORT Sales Hub — Production Readiness Checklist

This checklist is for the Coolify deployment at `sales.4sport.co.za`.

## Runtime

- Production image builds with the Nitro Node preset.
- Runtime command is `node dist/server/index.mjs`.
- Container listens on port `3000` on all interfaces.
- `GET /api/health` returns HTTP 200 without depending on Supabase or third-party services.

## Coolify

- Deploy from `main` only after the relevant PR has been merged.
- Keep the public domain on `sales.4sport.co.za`.
- Route traffic to container port `3000`.
- Configure the health check path as `/api/health` after the health PR is merged.
- Keep TLS/HTTPS enabled through Coolify/Traefik.

## Environment variables

Public build-time values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Server-only values — never expose as `VITE_*`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_VERIFY_TOKEN`
- `BRAVE_SEARCH_API_KEY`

Marketing intake does not require browser-side database credentials; Factory posts to the Sales Hub server endpoint.

## Smoke test after deployment

1. Open `https://sales.4sport.co.za/api/health` and confirm HTTP 200.
2. Open the login page and sign in as an admin.
3. Run the existing System Check page.
4. Open Dashboard, Leads, Meetings, Signups, Support, WhatsApp, Performance, Reps, Activity and Marketing.
5. Confirm a test lead can be created and removed.
6. Confirm no service-role key or server-only secret appears in browser source/network responses.
7. Confirm WhatsApp webhook verification still responds correctly.
8. Confirm lead research fails cleanly if Brave is unavailable rather than crashing the app.

## Marketing attribution gate

Do not merge the Factory marketing-intake PR until the Sales Hub marketing-lead endpoint build has passed and an end-to-end test proves:

`tracked Factory URL -> enquiry -> Sales Hub lead -> campaign/creative attribution`

## Rollback

If the production deploy fails, redeploy the previous known-good `main` commit in Coolify. Do not edit production files directly on the server as a permanent fix; repair the repo and redeploy.
