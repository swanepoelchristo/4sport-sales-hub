import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ResearchTarget = {
  province?: string;
  city?: string;
  region?: string;
  org_type?: "School" | "Club" | "Academy" | "Other";
  sports?: string[];
  max_results?: number;
};

type BraveResult = {
  title?: string;
  url?: string;
  description?: string;
  extra_snippets?: string[];
};

const ALLOWED_ORG_TYPES = new Set(["School", "Club", "Academy", "Other"]);

const SAFE_SPORTS = new Set([
  "Rugby",
  "Athletics",
  "Swimming",
  "Hockey",
  "Netball",
  "Soccer",
  "Cricket",
  "Multi-sport",
  "Other",
]);

function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanOrgName(title: string) {
  return cleanText(title)
    .replace(/\s*[\-|–|—|•]\s*(home|contact|contacts|about|official website).*$/i, "")
    .replace(/\b(home|contact us|contacts|official website)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function websiteFromUrl(url: string) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return "";
  }
}

function extractEmail(text: string) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? "";
}

function extractPhone(text: string) {
  const match = text.match(/(?:\+27|0)(?:\s|-|\.)?\d{2}(?:\s|-|\.)?\d{3}(?:\s|-|\.)?\d{4}/);
  return match?.[0]?.replace(/\s+/g, " ").trim() ?? "";
}

function buildQueries(target: Required<Pick<ResearchTarget, "province" | "org_type">> & ResearchTarget) {
  const province = cleanText(target.province);
  const city = cleanText(target.city);
  const orgType = target.org_type;
  const sports = (target.sports || [])
    .map(cleanText)
    .filter((sport) => SAFE_SPORTS.has(sport));

  const selectedSports = sports.length ? sports : ["Hockey", "Rugby", "Netball"];
  const place = [city, province, "South Africa"].filter(Boolean).join(" ");

  const queries: string[] = [];

  for (const sport of selectedSports) {
    queries.push(`${place} ${sport} ${orgType} official website contact`);
    queries.push(`${place} ${sport} ${orgType} public email phone contact`);
    queries.push(`${place} ${sport} ${orgType} admin office contact`);
  }

  return [...new Set(queries)].slice(0, 8);
}

async function getAdminUserId(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { error: "Missing auth token", status: 401 as const };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  const authUser = authData?.user;

  if (authError || !authUser) {
    return { error: "Invalid auth token", status: 401 as const };
  }

  const { data: roleRows, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", authUser.id);

  if (roleError) {
    return { error: roleError.message, status: 500 as const };
  }

  const isAdmin = (roleRows || []).some((row: any) => row.role === "admin");

  if (!isAdmin) {
    return { error: "Only admin can generate public lead candidates", status: 403 as const };
  }

  return { userId: authUser.id };
}

async function braveSearch(query: string, apiKey: string, count: number) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(Math.min(Math.max(count, 1), 10)));
  url.searchParams.set("country", "za");
  url.searchParams.set("search_lang", "en");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Search provider error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json: any = await res.json();
  return (json?.web?.results || []) as BraveResult[];
}

function resultToCandidate(result: BraveResult, query: string, target: ResearchTarget, userId: string) {
  const sourceUrl = cleanText(result.url);
  const title = cleanText(result.title);
  const description = cleanText(result.description);
  const snippets = Array.isArray(result.extra_snippets) ? result.extra_snippets.map(cleanText).join(" ") : "";
  const combined = [title, description, snippets].filter(Boolean).join(" ");

  const website = websiteFromUrl(sourceUrl);
  const orgName = cleanOrgName(title) || website.replace(/^https?:\/\//, "") || "Public source candidate";
  const publicEmail = extractEmail(combined);
  const publicPhone = extractPhone(combined);

  return {
    org_name: orgName,
    org_type: target.org_type || "School",
    province: target.province || "",
    city: target.city || "",
    region: target.region || "",
    sport_focus: (target.sports && target.sports[0]) || "Other",

    contact_person: "",
    contact_role: publicEmail || publicPhone ? "Public admin/contact listed in source snippet" : "",
    public_phone: publicPhone,
    public_email: publicEmail,
    website,

    source_url_1: sourceUrl,
    source_url_2: "",
    source_url_3: "",
    source_note: [
      "AUTO-GENERATED PUBLIC-SOURCE CANDIDATE.",
      "Human check required before conversion to a real lead.",
      `Search query: ${query}`,
      title ? `Result title: ${title}` : "",
      description ? `Result snippet: ${description.slice(0, 500)}` : "",
      "Safety: do not use child, athlete, guardian, private, hidden, leaked or questionable personal data.",
    ].filter(Boolean).join("\n"),

    verification_status: "needs_check",
    created_by: userId,
  };
}

export const Route = createFileRoute("/api/lead-research")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = await getAdminUserId(request);
        if ("error" in admin) {
          return Response.json({ ok: false, error: admin.error }, { status: admin.status });
        }

        const apiKey = process.env.BRAVE_SEARCH_API_KEY;
        if (!apiKey) {
          return Response.json({
            ok: false,
            error: "BRAVE_SEARCH_API_KEY is not configured on the server.",
          }, { status: 500 });
        }

        const body = await request.json().catch(() => ({}));
        const target: ResearchTarget = {
          province: cleanText(body.province || "Gauteng"),
          city: cleanText(body.city || ""),
          region: cleanText(body.region || ""),
          org_type: ALLOWED_ORG_TYPES.has(body.org_type) ? body.org_type : "School",
          sports: Array.isArray(body.sports)
            ? body.sports.map(cleanText).filter((sport: string) => SAFE_SPORTS.has(sport))
            : ["Hockey", "Rugby", "Netball"],
          max_results: Math.min(Math.max(Number(body.max_results || 8), 1), 20),
        };

        const queries = buildQueries(target as Required<Pick<ResearchTarget, "province" | "org_type">> & ResearchTarget);

        const allCandidates: any[] = [];
        const seenUrls = new Set<string>();

        for (const query of queries) {
          const results = await braveSearch(query, apiKey, 5);

          for (const result of results) {
            const sourceUrl = cleanText(result.url);
            if (!sourceUrl || seenUrls.has(sourceUrl)) continue;
            seenUrls.add(sourceUrl);

            const candidate = resultToCandidate(result, query, target, admin.userId);
            if (!candidate.source_url_1) continue;

            allCandidates.push(candidate);
            if (allCandidates.length >= (target.max_results || 8)) break;
          }

          if (allCandidates.length >= (target.max_results || 8)) break;
        }

        if (!allCandidates.length) {
          return Response.json({
            ok: true,
            inserted: [],
            skipped: 0,
            queries,
            message: "No public-source candidates found for this target.",
          });
        }

        const urls = allCandidates.map((c) => c.source_url_1);

        const { data: existingCandidates } = await supabaseAdmin
          .from("lead_candidates")
          .select("source_url_1")
          .in("source_url_1", urls);

        const { data: existingLeads } = await supabaseAdmin
          .from("leads")
          .select("source_url")
          .in("source_url", urls);

        const existingUrls = new Set([
          ...(existingCandidates || []).map((r: any) => r.source_url_1),
          ...(existingLeads || []).map((r: any) => r.source_url),
        ].filter(Boolean));

        const toInsert = allCandidates.filter((c) => !existingUrls.has(c.source_url_1));

        if (!toInsert.length) {
          return Response.json({
            ok: true,
            inserted: [],
            skipped: allCandidates.length,
            queries,
            message: "All found candidates already exist in Research Inbox or Leads.",
          });
        }

        const { data, error } = await supabaseAdmin
          .from("lead_candidates")
          .insert(toInsert)
          .select("*");

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        return Response.json({
          ok: true,
          inserted: data || [],
          skipped: allCandidates.length - toInsert.length,
          queries,
        });
      },
    },
  },
});
