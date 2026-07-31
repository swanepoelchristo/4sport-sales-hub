export type MarketingObjective = "book_demo" | "generate_enquiry" | "awareness";
export type MarketingAudience = "principals" | "heads_of_sport" | "coaches" | "parents" | "mixed";
export type MarketingAngle = "administration" | "safety" | "communication" | "fixtures" | "platform";
export type MarketingCampaignStatus = "draft" | "testing" | "active" | "paused" | "completed";

export interface MarketingCampaign {
  id: string;
  name: string;
  objective: MarketingObjective;
  audience: MarketingAudience;
  angle: MarketingAngle;
  budget_zar: number;
  status: MarketingCampaignStatus;
  landing_path: string;
  external_campaign_id?: string | null;
  created_at: string;
}

export interface MarketingCreative {
  id: string;
  campaign_id: string;
  name: string;
  creative_code: string;
  headline: string;
  primary_text: string;
  call_to_action: string;
  asset_type: "image" | "video" | "text";
  external_creative_id?: string | null;
  created_at: string;
}

export interface MarketingAttribution {
  campaign_code: string;
  creative_code: string;
  source: string;
  medium: string;
  landing_path: string;
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildCampaignCode(name: string, date = new Date()) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);
  return `4s-${year}${month}-${slug(name)}`;
}

export function buildTrackedLandingUrl(
  baseUrl: string,
  landingPath: string,
  attribution: Pick<MarketingAttribution, "campaign_code" | "creative_code"> & {
    source?: string;
    medium?: string;
  },
) {
  const url = new URL(landingPath || "/", baseUrl);
  url.searchParams.set("utm_source", attribution.source || "meta");
  url.searchParams.set("utm_medium", attribution.medium || "paid_social");
  url.searchParams.set("utm_campaign", attribution.campaign_code);
  url.searchParams.set("utm_content", attribution.creative_code);
  return url.toString();
}

export function normaliseAttribution(input: Partial<MarketingAttribution>): MarketingAttribution {
  return {
    campaign_code: input.campaign_code?.trim() || "",
    creative_code: input.creative_code?.trim() || "",
    source: input.source?.trim() || "",
    medium: input.medium?.trim() || "",
    landing_path: input.landing_path?.trim() || "",
  };
}
