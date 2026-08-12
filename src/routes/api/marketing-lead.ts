import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = new Set([
  "https://4sport.co.za",
  "https://www.4sport.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);

type OrgType = Database["public"]["Enums"]["org_type"];
const ORG_TYPES = new Set<OrgType>(["School", "Club", "Academy", "Other"]);

type Tables = Database["public"]["Tables"];
type LeadRow = Tables["leads"]["Row"] & {
  marketing_campaign_id: string | null;
  marketing_creative_id: string | null;
  marketing_campaign_code: string;
  marketing_creative_code: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  landing_path: string;
};
type MarketingLeadDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Omit<Tables, "leads"> & {
      leads: {
        Row: LeadRow;
        Insert: Tables["leads"]["Insert"] & Partial<LeadRow>;
        Update: Tables["leads"]["Update"] & Partial<LeadRow>;
        Relationships: Tables["leads"]["Relationships"];
      };
      marketing_campaigns: {
        Row: { id: string; campaign_code: string };
        Insert: { campaign_code: string };
        Update: { campaign_code?: string };
        Relationships: [];
      };
      marketing_creatives: {
        Row: { id: string; campaign_id: string; creative_code: string };
        Insert: { campaign_id: string; creative_code: string };
        Update: { campaign_id?: string; creative_code?: string };
        Relationships: [];
      };
    };
  };
};

const marketingLeadAdmin = supabaseAdmin as unknown as SupabaseClient<MarketingLeadDatabase>;

function isOrgType(value: string): value is OrgType {
  return ORG_TYPES.has(value as OrgType);
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "access-control-allow-origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://4sport.co.za",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  };
}

function clean(value: unknown, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

export const Route = createFileRoute("/api/marketing-lead")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        const origin = request.headers.get("origin") ?? "";
        if (origin && !ALLOWED_ORIGINS.has(origin)) {
          return json(request, { error: "Origin not allowed" }, 403);
        }

        try {
          const payload = (await request.json()) as Record<string, unknown>;

          const orgName = clean(payload.org_name, 160);
          const contactPerson = clean(payload.contact_person, 120);
          const email = clean(payload.email, 180).toLowerCase();
          const phone = clean(payload.phone, 60);
          const message = clean(payload.message, 1200);

          if (!orgName || (!email && !phone)) {
            return json(request, { error: "Organisation and either email or phone are required." }, 400);
          }

          const requestedOrgType = clean(payload.org_type, 40) || "School";
          const orgType = isOrgType(requestedOrgType) ? requestedOrgType : "Other";
          const campaignCode = clean(payload.utm_campaign ?? payload.marketing_campaign_code, 120);
          const creativeCode = clean(payload.utm_content ?? payload.marketing_creative_code, 120);
          const utmSource = clean(payload.utm_source, 80);
          const utmMedium = clean(payload.utm_medium, 80);
          const landingPath = clean(payload.landing_path, 240);
          let marketingCampaignId: string | null = null;
          let marketingCreativeId: string | null = null;

          if (campaignCode) {
            const { data: campaign } = await marketingLeadAdmin
              .from("marketing_campaigns")
              .select("id")
              .eq("campaign_code", campaignCode)
              .maybeSingle();
            marketingCampaignId = campaign?.id ?? null;
          }

          if (marketingCampaignId && creativeCode) {
            const { data: creative } = await marketingLeadAdmin
              .from("marketing_creatives")
              .select("id")
              .eq("campaign_id", marketingCampaignId)
              .eq("creative_code", creativeCode)
              .maybeSingle();
            marketingCreativeId = creative?.id ?? null;
          }

          const notes = [
            "Website marketing enquiry",
            message ? `Message: ${message}` : "",
            landingPath ? `Landing page: ${landingPath}` : "",
          ]
            .filter(Boolean)
            .join("\n");

          const { data: lead, error } = await marketingLeadAdmin
            .from("leads")
            .insert({
              org_name: orgName,
              org_type: orgType,
              province: clean(payload.province, 80),
              city: clean(payload.city, 100),
              region: clean(payload.region, 100),
              sport_focus: clean(payload.sport_focus, 100),
              contact_person: contactPerson,
              contact_role: clean(payload.contact_role, 100),
              phone,
              email,
              lead_source: utmSource ? `Website / ${utmSource}` : "Website",
              status: "New Lead",
              notes,
              marketing_campaign_id: marketingCampaignId,
              marketing_creative_id: marketingCreativeId,
              marketing_campaign_code: campaignCode,
              marketing_creative_code: creativeCode,
              utm_source: utmSource,
              utm_medium: utmMedium,
              utm_campaign: campaignCode,
              utm_content: creativeCode,
              landing_path: landingPath,
            })
            .select("id")
            .single();

          if (error) {
            console.error("marketing lead insert failed", error);
            return json(request, { error: "Could not submit enquiry." }, 500);
          }

          return json(request, { ok: true, lead_id: lead.id }, 201);
        } catch (error) {
          console.error("marketing lead intake failed", error);
          return json(request, { error: "Could not submit enquiry." }, 500);
        }
      },
    },
  },
});
