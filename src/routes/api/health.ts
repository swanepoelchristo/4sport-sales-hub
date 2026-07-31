import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            ok: true,
            service: "4sport-sales-hub",
            timestamp: new Date().toISOString(),
          },
          {
            status: 200,
            headers: {
              "cache-control": "no-store",
            },
          },
        ),
    },
  },
});
