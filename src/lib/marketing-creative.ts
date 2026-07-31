import type { MarketingAngle, MarketingAudience, MarketingObjective } from "./marketing";

export type MarketingCreativeAssetType = "image" | "video" | "text";

export interface ApprovedWebsiteContent {
  pageUrl: string;
  pageTitle: string;
  heading?: string;
  body: string;
  approvedAt?: string;
}

export interface MarketingCreativeBrief {
  campaignName: string;
  objective: MarketingObjective;
  audience: MarketingAudience;
  angle: MarketingAngle;
  landingPath: string;
  callToAction: string;
  assetType: MarketingCreativeAssetType;
  websiteContent: ApprovedWebsiteContent[];
}

export interface MarketingCreativeDraft {
  name: string;
  headline: string;
  primaryText: string;
  callToAction: string;
  assetType: MarketingCreativeAssetType;
  audience: MarketingAudience;
  angle: MarketingAngle;
  landingPath: string;
  sourcePages: string[];
  rationale: string;
}

export interface MarketingCreativeGenerationRequest {
  brief: MarketingCreativeBrief;
  variants?: number;
}

export interface MarketingCreativeProvider {
  generate(request: MarketingCreativeGenerationRequest): Promise<MarketingCreativeDraft[]>;
}

const MAX_SOURCE_CHARS = 12_000;

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitiseApprovedWebsiteContent(
  content: ApprovedWebsiteContent[],
): ApprovedWebsiteContent[] {
  let remaining = MAX_SOURCE_CHARS;
  const safe: ApprovedWebsiteContent[] = [];

  for (const item of content) {
    if (remaining <= 0) break;
    const body = compact(item.body).slice(0, remaining);
    if (!body) continue;
    remaining -= body.length;
    safe.push({
      ...item,
      pageTitle: compact(item.pageTitle),
      heading: item.heading ? compact(item.heading) : undefined,
      body,
    });
  }

  return safe;
}

export function buildCreativeGenerationPrompt(brief: MarketingCreativeBrief) {
  const sources = sanitiseApprovedWebsiteContent(brief.websiteContent);
  const sourceText = sources
    .map((source, index) => [
      `SOURCE ${index + 1}`,
      `URL: ${source.pageUrl}`,
      `TITLE: ${source.pageTitle}`,
      source.heading ? `HEADING: ${source.heading}` : "",
      `CONTENT: ${source.body}`,
    ].filter(Boolean).join("\n"))
    .join("\n\n");

  return `You are preparing advertising copy for 4SPORT.\n\n` +
    `Use ONLY the approved website content supplied below for factual product claims. ` +
    `Do not invent features, prices, customer counts, safety outcomes, testimonials, integrations or guarantees. ` +
    `Do not target children or use athlete personal data. ` +
    `The output is a draft for human approval and must not imply that it has already been published.\n\n` +
    `CAMPAIGN\n` +
    `Name: ${brief.campaignName}\n` +
    `Objective: ${brief.objective}\n` +
    `Audience: ${brief.audience}\n` +
    `Message angle: ${brief.angle}\n` +
    `Landing path: ${brief.landingPath}\n` +
    `CTA: ${brief.callToAction}\n` +
    `Asset type: ${brief.assetType}\n\n` +
    `Return concise draft variants. Each variant must include: name, headline, primaryText, ` +
    `callToAction, rationale, and the source page URLs used.\n\n` +
    `APPROVED WEBSITE CONTENT\n${sourceText}`;
}

export function validateCreativeDraft(
  draft: MarketingCreativeDraft,
  brief: MarketingCreativeBrief,
): MarketingCreativeDraft {
  const sourceUrls = new Set(brief.websiteContent.map((item) => item.pageUrl));
  const validSources = draft.sourcePages.filter((url) => sourceUrls.has(url));

  if (!compact(draft.headline)) throw new Error("Creative headline is required.");
  if (!compact(draft.primaryText)) throw new Error("Creative primary text is required.");
  if (validSources.length === 0) throw new Error("Creative must cite at least one approved website source.");

  return {
    ...draft,
    name: compact(draft.name),
    headline: compact(draft.headline),
    primaryText: compact(draft.primaryText),
    callToAction: compact(draft.callToAction || brief.callToAction),
    audience: brief.audience,
    angle: brief.angle,
    landingPath: brief.landingPath,
    assetType: brief.assetType,
    sourcePages: validSources,
    rationale: compact(draft.rationale),
  };
}
