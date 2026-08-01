import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ALLOWED_ORIGINS = new Set([
  "https://4sport.co.za",
  "https://www.4sport.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);

const ORG_TYPES = new Set(["School", "Club", "Academy", "Other"]);

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
          const orgType = ORG_TYPES.has(requestedOrgType) ? requestedOrgType : "Other";
          const campaignCode = clean(payload.utm_campaign ?? payload.marketing_campaign_code, 120);
          const creativeCode = clean(payload.utm_content ?? payload.marketing_creative_code, 120);
          const utmSource = clean(payload.utm_source, 80);
          const utmMedium = clean(payload.utm_medium, 80);
          const landingPath = clean(payload.landing_path, 240);
          const admin = supabaseAdmin as any;

          let marketingCampaignId: string | null = null;
          let marketingCreativeId: string | null = null;

          if (campaignCode) {
            const { data: campaign } = await admin
              .from("marketing_campaigns")
              .select("id")
              .eq("campaign_code", campaignCode)
              .maybeSingle();
            marketingCampaignId = campaign?.id ?? null;
          }

          if (marketingCampaignId && creativeCode) {
            const { data: creative } = await admin
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

          const { data: lead, error } = await admin
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
              marketing_campaign_code: campaignCode || null,
              marketing_creative_code: creativeCode || null,
              utm_source: utmSource || null,
              utm_medium: utmMedium || null,
              utm_campaign: campaignCode || null,
              utm_content: creativeCode || null,
              landing_path: landingPath || null,
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
