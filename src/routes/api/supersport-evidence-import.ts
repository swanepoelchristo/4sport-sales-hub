import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type EvidenceOrganisation = {
  source_external_id: string;
  organisation_name: string;
  organisation_type: "School" | "Club" | "Other";
  sport: string;
  venue: string;
  province: string;
  region: string;
  competition: string;
  source_url: string;
  provider_event_id: string;
  event_date: string;
};

type EvidencePayload = {
  generated_at: string;
  source_system: "supersport_schools";
  count: number;
  organisations: EvidenceOrganisation[];
};

type CandidateInsert = Database["public"]["Tables"]["lead_candidates"]["Insert"];

const ALLOWED_ORG_TYPES = new Set(["School", "Club", "Other"]);
const ALLOWED_SPORTS = new Set([
  "Rugby", "Athletics", "Swimming", "Hockey", "Netball",
  "Soccer", "Cricket", "Multi-sport", "Other",
]);
const DUPLICATE_QUERY_BATCH_SIZE = 100;
const INSERT_BATCH_SIZE = 100;

function chunks<T>(values: T[], size: number) {
  const batches: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size));
  }
  return batches;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseOrganisation(value: unknown): EvidenceOrganisation | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const organisationName = clean(row.organisation_name, 200);
  const organisationType = clean(row.organisation_type, 30);
  const sourceUrl = clean(row.source_url, 1000);

  if (
    !organisationName ||
    !isHttpUrl(sourceUrl) ||
    !ALLOWED_ORG_TYPES.has(organisationType)
  ) return null;

  return {
    source_external_id: clean(row.source_external_id, 200),
    organisation_name: organisationName,
    organisation_type: organisationType as EvidenceOrganisation["organisation_type"],
    sport: clean(row.sport, 100),
    venue: clean(row.venue, 200),
    province: clean(row.province, 100),
    region: clean(row.region, 100),
    competition: clean(row.competition, 200),
    source_url: sourceUrl,
    provider_event_id: clean(row.provider_event_id, 200),
    event_date: clean(row.event_date, 50),
  };
}

function parseEvidencePayload(value: unknown): EvidencePayload | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (body.source_system !== "supersport_schools" || !Array.isArray(body.organisations)) return null;

  const organisations = body.organisations
    .map(parseOrganisation)
    .filter((row): row is EvidenceOrganisation => row !== null);

  return {
    generated_at: clean(body.generated_at, 100),
    source_system: "supersport_schools",
    count: typeof body.count === "number" ? body.count : organisations.length,
    organisations,
  };
}

async function requireAdmin(request: Request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "Missing auth token", status: 401 as const };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { error: "Invalid auth token", status: 401 as const };

  const { data: roles, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  if (roleError) return { error: roleError.message, status: 500 as const };
  if (!(roles || []).some((row) => row.role === "admin")) {
    return { error: "Only admin can import organisation evidence", status: 403 as const };
  }

  return { userId: data.user.id };
}

export const Route = createFileRoute("/api/supersport-evidence-import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = await requireAdmin(request);
        if ("error" in admin) {
          return Response.json({ ok: false, error: admin.error }, { status: admin.status });
        }

        const exportUrl = process.env.SUPERSPORT_EVIDENCE_EXPORT_URL;
        const exportSecret = process.env.SUPERSPORT_EVIDENCE_EXPORT_SECRET;
        if (!exportUrl || !exportSecret) {
          return Response.json({
            ok: false,
            error: "SuperSport organisation evidence import is not configured.",
          }, { status: 503 });
        }

        let response: Response;
        try {
          response = await fetch(exportUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${exportSecret}`,
            },
            signal: AbortSignal.timeout(15_000),
          });
        } catch {
          return Response.json({ ok: false, error: "Organisation evidence source is unavailable." }, { status: 502 });
        }

        if (!response.ok) {
          return Response.json({
            ok: false,
            error: `Organisation evidence source returned HTTP ${response.status}.`,
          }, { status: 502 });
        }

        const payload = parseEvidencePayload(await response.json().catch(() => null));
        if (!payload) {
          return Response.json({ ok: false, error: "Organisation evidence response is invalid." }, { status: 502 });
        }

        const sourceUrls = [...new Set(payload.organisations.map((row) => row.source_url))];
        if (!sourceUrls.length) {
          return Response.json({ ok: true, fetched: 0, created: 0, skipped: 0, inserted: [] });
        }

        const knownUrls = new Set<string>();
        for (const sourceUrlBatch of chunks(sourceUrls, DUPLICATE_QUERY_BATCH_SIZE)) {
          const [
            { data: existingCandidates, error: candidateError },
            { data: existingLeads, error: leadError },
          ] = await Promise.all([
            supabaseAdmin
              .from("lead_candidates")
              .select("source_url_1")
              .in("source_url_1", sourceUrlBatch),
            supabaseAdmin
              .from("leads")
              .select("source_url")
              .in("source_url", sourceUrlBatch),
          ]);

          if (candidateError || leadError) {
            return Response.json({
              ok: false,
              error: candidateError?.message || leadError?.message || "Duplicate check failed.",
            }, { status: 500 });
          }

          for (const row of existingCandidates || []) {
            if (row.source_url_1) knownUrls.add(row.source_url_1);
          }
          for (const row of existingLeads || []) {
            if (row.source_url) knownUrls.add(row.source_url);
          }
        }

        const candidates: CandidateInsert[] = [];
        for (const evidence of payload.organisations) {
          if (knownUrls.has(evidence.source_url)) continue;
          knownUrls.add(evidence.source_url);

          const sportFocus = ALLOWED_SPORTS.has(evidence.sport) ? evidence.sport : "Other";
          const details = [
            "SUPERSPORT SCHOOLS ORGANISATION EVIDENCE.",
            "This record proves an organisation participates in a televised sports event; it is not a verified sales contact.",
            evidence.competition ? `Competition: ${evidence.competition}.` : "",
            evidence.venue ? `Venue: ${evidence.venue}.` : "",
            evidence.event_date ? `Event date: ${evidence.event_date}.` : "",
            evidence.provider_event_id ? `Provider event: ${evidence.provider_event_id}.` : "",
            "Human verification is required before conversion to a lead.",
          ].filter(Boolean).join("\n");

          candidates.push({
            org_name: evidence.organisation_name,
            org_type: evidence.organisation_type,
            province: evidence.province,
            city: "",
            region: evidence.region,
            sport_focus: sportFocus,
            contact_person: "",
            contact_role: "",
            public_phone: "",
            public_email: "",
            website: "",
            source_url_1: evidence.source_url,
            source_url_2: "",
            source_url_3: "",
            source_note: details,
            verification_status: "needs_check",
            created_by: admin.userId,
          });
        }

        const inserted: unknown[] = [];
        for (const candidateBatch of chunks(candidates, INSERT_BATCH_SIZE)) {
          const { data, error } = await supabaseAdmin
            .from("lead_candidates")
            .insert(candidateBatch)
            .select("*");
          if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
          inserted.push(...(data || []));
        }

        return Response.json({
          ok: true,
          fetched: payload.organisations.length,
          created: inserted.length,
          skipped: payload.organisations.length - inserted.length,
          inserted,
        });
      },
    },
  },
});
