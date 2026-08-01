# Coolify handoff — 4SPORT Sales Hub

Current production target: `sales.4sport.co.za`.

The repository now uses a production Nitro/Node runtime rather than the Vite development server. The verified runtime entry is `dist/server/index.mjs` on port `3000`.

When the production-readiness health PR is merged, set Coolify's health check path to `/api/health` and expect HTTP 200.

Do not place `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_VERIFY_TOKEN`, or `BRAVE_SEARCH_API_KEY` in any `VITE_*` variable. Those values are server-only.

Before each production deployment, verify the branch builds successfully and keep the previous known-good `main` commit available for rollback.
