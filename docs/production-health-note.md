# Production health endpoint

`GET /api/health` is intentionally a lightweight liveness endpoint. It does not query Supabase or any third-party service, so a temporary provider outage does not cause Coolify to restart an otherwise healthy application container.

Use the authenticated System Check page for deeper application/database checks after deployment.
