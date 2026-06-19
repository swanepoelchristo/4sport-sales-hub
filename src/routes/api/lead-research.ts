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

type QualityResult = {
  allowed: boolean;
  score: number;
  quality: "High" | "Medium" | "Low" | "Rejected";
  activityCategory: "Sport" | "Culture" | "Academic" | "General";
  activityFocus: string;
  reasons: string[];
  rejectReason?: string;
};

const ALLOWED_ORG_TYPES = new Set(["School", "Club", "Academy", "Other"]);

const SPORT_ACTIVITIES = [
  "Rugby",
  "Athletics",
  "Swimming",
  "Hockey",
  "Netball",
  "Soccer",
  "Cricket",
  "Multi-sport",
];

const CULTURE_ACTIVITIES = [
  "Choir",
  "Drama",
  "Debating",
  "Music",
  "Dance",
  "Eisteddfod",
  "Culture",
];

const ACADEMIC_ACTIVITIES = [
  "Maths Club",
  "Science Club",
  "Robotics",
  "Coding",
  "Chess",
  "Olympiad",
  "Quiz",
  "Academic Clubs",
];

const GENERAL_ACTIVITIES = [
  "School Activities",
  "Extramural",
  "Events",
  "Admissions",
  "Parent Communication",
  "General School",
];

const ALL_ACTIVITIES = [
  ...SPORT_ACTIVITIES,
  ...CULTURE_ACTIVITIES,
  ...ACADEMIC_ACTIVITIES,
  ...GENERAL_ACTIVITIES,
  "Other",
];

const ALLOWED_ACTIVITIES = new Set(ALL_ACTIVITIES);

const ASSOCIATION_SIGNALS = [
  "association",
  "federation",
  "union",
  "league",
  "tournament",
  "fixtures",
  "results",
  "sashoc",
  "southern gauteng hockey",
  "provincial hockey",
  "hockey association",
  "schools hockey association",
  "sports body",
  "governing body",
  "rules and regulations",
  "board which promotes",
];

const GOVERNMENT_SIGNALS = [
  ".gov.za",
  "education.gov.za",
  "gauteng.gov.za",
  "provincialgovernment.co.za",
  "department of education",
  "gauteng department education",
  "gauteng department of education",
  "provincial government",
  "ministry of education",
  "education department",
];

const DIRECTORY_SIGNALS = [
  "directory",
  "schools directory",
  "school directory",
  "list of schools",
  "emis",
  "schools4sa",
  "schoolguide",
  "schoolparrot",
  "brabys",
  "snupit",
  "sayellow",
  "yellosa",
  "infobel",
  "gauteng.co.za",
  "zaubee",
  "africabizinfo",
];

const GENERIC_TITLE_SIGNALS = [
  "contact details",
  "contact us",
  "contacts",
  "department education",
  "gauteng department",
  "provincial office",
  "district office",
  "regional office",
];

const INDIVIDUAL_SCHOOL_NAME_SIGNALS = [
  "school",
  "high school",
  "primary school",
  "preparatory school",
  "college",
  "academy",
  "laerskool",
  "hoërskool",
  "hoerskool",
  "skool",
  "kollege",
];

const SCHOOL_SIGNALS = [
  "school",
  "high school",
  "primary school",
  "preparatory school",
  "college",
  "academy",
  "learners",
  "students",
  "admissions",
  "principal",
  "school office",
];

const CONTACT_SIGNALS = [
  "contact",
  "contacts",
  "contact us",
  "office",
  "admin",
  "admissions",
  "secretary",
  "telephone",
  "email",
];

function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value: unknown) {
  return cleanText(value).toLowerCase();
}

function hostFromUrl(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

type SourceType =
  | "individual_school"
  | "government_department"
  | "directory"
  | "association"
  | "generic_contact"
  | "unknown";

function hasAny(text: string, signals: string[]) {
  return signals.some((signal) => text.includes(signal));
}

function classifySource(result: BraveResult): SourceType {
  const title = lower(result.title);
  const url = lower(result.url);
  const host = hostFromUrl(cleanText(result.url));
  const description = lower(result.description);
  const snippets = Array.isArray(result.extra_snippets)
    ? result.extra_snippets.map(lower).join(" ")
    : "";
  const combined = [title, url, host, description, snippets].join(" ");

  if (hasAny(combined, GOVERNMENT_SIGNALS) || host.endsWith(".gov.za")) {
    return "government_department";
  }

  if (hasAny(combined, ASSOCIATION_SIGNALS)) {
    return "association";
  }

  if (hasAny(combined, DIRECTORY_SIGNALS)) {
    return "directory";
  }

  const genericOnlyTitle =
    GENERIC_TITLE_SIGNALS.includes(title) ||
    GENERIC_TITLE_SIGNALS.some((signal) => title === signal || title.startsWith(`${signal} -`));

  if (genericOnlyTitle) {
    return "generic_contact";
  }

  const titleLooksLikeSchool = hasAny(title, INDIVIDUAL_SCHOOL_NAME_SIGNALS);
  const hostLooksLikeSchool = hasAny(host, ["school", "college", "academy", "laerskool", "hoerskool", "skool"]);
  const textHasSchoolSignal = hasAny(combined, SCHOOL_SIGNALS);

  if ((titleLooksLikeSchool || hostLooksLikeSchool) && textHasSchoolSignal) {
    return "individual_school";
  }

  return "unknown";
}

function cleanOrgName(title: string) {
  return cleanText(title)
    .replace(/\s*[\-|–|—|•|:]\s*(home|contact|contacts|about|official website|school website).*$/i, "")
    .replace(/\b(home|contact us|contacts|official website|school website)\b/gi, "")
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

function activityCategory(activity: string): QualityResult["activityCategory"] {
  if (SPORT_ACTIVITIES.includes(activity)) return "Sport";
  if (CULTURE_ACTIVITIES.includes(activity)) return "Culture";
  if (ACADEMIC_ACTIVITIES.includes(activity)) return "Academic";
  return "General";
}

function normalizeActivities(input: unknown) {
  if (!Array.isArray(input)) {
    return ["Hockey", "Rugby", "Netball", "Choir", "Maths Club", "Robotics", "General School"];
  }

  const cleaned = input.map(cleanText).filter((value) => ALLOWED_ACTIVITIES.has(value));

  return cleaned.length ? cleaned : ["General School"];
}

function sportFocusForCandidate(activity: string, target: ResearchTarget) {
  const normalizedActivities = normalizeActivities(target.sports);
  const selectedSport = normalizedActivities.find((value) => SPORT_ACTIVITIES.includes(value));

  if (SPORT_ACTIVITIES.includes(activity)) return activity;
  if (selectedSport) return selectedSport;

  return "Other";
}

function buildQueries(target: Required<Pick<ResearchTarget, "province" | "org_type">> & ResearchTarget) {
  const province = cleanText(target.province);
  const city = cleanText(target.city);
  const orgType = target.org_type;
  const activities = normalizeActivities(target.sports);
  const place = [city, province, "South Africa"].filter(Boolean).join(" ");

  const queries: string[] = [];

  if (orgType === "School") {
    const rejectTerms = "-department -government -directory -association -federation -sashoc";
    queries.push(`${place} "High School" "Contact" official website ${rejectTerms}`);
    queries.push(`${place} "Primary School" "Contact" official website ${rejectTerms}`);
    queries.push(`${place} "College" "Contact" school official website ${rejectTerms}`);
    queries.push(`${place} "Laerskool" "Kontak" ${rejectTerms}`);
    queries.push(`${place} "Hoerskool" "Kontak" ${rejectTerms}`);
    queries.push(`${place} school extramural activities contact ${rejectTerms}`);
    queries.push(`${place} school choir maths club robotics contact ${rejectTerms}`);

    for (const activity of activities) {
      if (activity === "Other") continue;
      queries.push(`${place} school ${activity} official website contact ${rejectTerms}`);
      queries.push(`${place} ${activity} "High School" contact ${rejectTerms}`);
    }
  } else {
    for (const activity of activities) {
      queries.push(`${place} ${activity} ${orgType} official website contact`);
      queries.push(`${place} ${activity} ${orgType} public email phone contact`);
    }
  }

  return [...new Set(queries)].slice(0, 12);
}

function scoreResult(result: BraveResult, target: ResearchTarget): QualityResult {
  const title = cleanText(result.title);
  const sourceUrl = cleanText(result.url);
  const description = cleanText(result.description);
  const snippets = Array.isArray(result.extra_snippets) ? result.extra_snippets.map(cleanText).join(" ") : "";
  const combined = [title, sourceUrl, description, snippets].filter(Boolean).join(" ");
  const text = lower(combined);
  const sourceType = classifySource(result);

  const reasons: string[] = [];
  let score = 0;

  const hasSchoolSignal = SCHOOL_SIGNALS.some((signal) => text.includes(signal));
  const hasContactSignal = CONTACT_SIGNALS.some((signal) => text.includes(signal));
  const hasEmail = Boolean(extractEmail(combined));
  const hasPhone = Boolean(extractPhone(combined));

  const chosenActivities = normalizeActivities(target.sports);
  const foundActivity =
    chosenActivities.find((activity) => text.includes(activity.toLowerCase())) ||
    SPORT_ACTIVITIES.find((activity) => text.includes(activity.toLowerCase())) ||
    CULTURE_ACTIVITIES.find((activity) => text.includes(activity.toLowerCase())) ||
    ACADEMIC_ACTIVITIES.find((activity) => text.includes(activity.toLowerCase())) ||
    (text.includes("extramural") ? "Extramural" : "") ||
    (text.includes("activities") ? "School Activities" : "") ||
    "General School";

  if (target.org_type === "School" && sourceType !== "individual_school") {
    return {
      allowed: false,
      score: 0,
      quality: "Rejected",
      activityCategory: activityCategory(foundActivity),
      activityFocus: foundActivity,
      reasons: [`Source type rejected: ${sourceType}`],
      rejectReason: `Only individual school websites may be saved automatically. Source type was ${sourceType}.`,
    };
  }

  if (hasSchoolSignal) {
    score += 45;
    reasons.push("Individual school proof found");
  }

  if (hasContactSignal) {
    score += 15;
    reasons.push("Has contact/admin/admissions signal");
  }

  if (hasEmail) {
    score += 10;
    reasons.push("Public email found in search snippet");
  }

  if (hasPhone) {
    score += 10;
    reasons.push("Public phone found in search snippet");
  }

  if (foundActivity && foundActivity !== "General School") {
    score += 20;
    reasons.push(`Activity opportunity found: ${foundActivity}`);
  } else {
    score += 5;
    reasons.push("General school opportunity");
  }

  if (/\/contact|contact-us|contacts|admissions|about|kontak/i.test(sourceUrl)) {
    score += 10;
    reasons.push("Source URL looks like official contact/admissions page");
  }

  const quality: QualityResult["quality"] =
    score >= 75 ? "High" :
    score >= 55 ? "Medium" :
    "Low";

  return {
    allowed: score >= 55,
    score,
    quality,
    activityCategory: activityCategory(foundActivity),
    activityFocus: foundActivity,
    reasons: [`Source type: ${sourceType}`, ...reasons],
    rejectReason: score < 55 ? "Quality score too low for automatic school candidate creation." : undefined,
  };
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
  const quality = scoreResult(result, target);

  if (!quality.allowed) return null;

  return {
    org_name: orgName,
    org_type: target.org_type || "School",
    province: target.province || "",
    city: target.city || "",
    region: target.region || "",
    sport_focus: sportFocusForCandidate(quality.activityFocus, target),

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
      `Lead quality: ${quality.quality} (${quality.score}/100)`,
      `Source type: ${classifySource(result)}`,
      `Activity category: ${quality.activityCategory}`,
      `Activity focus: ${quality.activityFocus}`,
      `Quality reasons: ${quality.reasons.join("; ")}`,
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
          sports: normalizeActivities(body.sports),
          max_results: Math.min(Math.max(Number(body.max_results || 8), 1), 20),
        };

        const queries = buildQueries(target as Required<Pick<ResearchTarget, "province" | "org_type">> & ResearchTarget);

        const allCandidates: any[] = [];
        const seenUrls = new Set<string>();
        let rejectedByQuality = 0;

        for (const query of queries) {
          const results = await braveSearch(query, apiKey, 6);

          for (const result of results) {
            const sourceUrl = cleanText(result.url);
            if (!sourceUrl || seenUrls.has(sourceUrl)) continue;
            seenUrls.add(sourceUrl);

            const candidate = resultToCandidate(result, query, target, admin.userId);

            if (!candidate) {
              rejectedByQuality += 1;
              continue;
            }

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
            rejected_by_quality: rejectedByQuality,
            queries,
            message: "No high-quality public-source school candidates found for this target.",
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
            rejected_by_quality: rejectedByQuality,
            queries,
            message: "All high-quality candidates already exist in Research Inbox or Leads.",
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
          rejected_by_quality: rejectedByQuality,
          queries,
        });
      },
    },
  },
});
