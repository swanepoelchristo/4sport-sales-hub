# 4SPORT Marketing Lab — AI Creative Engine

## Purpose

Create advertising drafts from approved 4SPORT Factory website content without inventing product claims and without automatically spending money or publishing ads.

This is the next layer after attribution. It does not replace the attribution milestone:

Campaign -> Creative -> tracked Factory URL -> Lead -> Meeting -> Signup -> Paid

## V1 workflow

1. Admin selects a Marketing Lab campaign.
2. Sales Hub receives approved content from relevant 4SPORT Factory pages.
3. Admin chooses audience, message angle, CTA, landing page and asset type.
4. An AI provider generates several draft creative variants.
5. Every draft must reference the approved source page(s) used.
6. Admin reviews, edits, approves or rejects each draft.
7. Approved copy is saved as a `marketing_creatives` record.
8. Sales Hub creates the tracked Factory link for that creative.
9. Publishing to Meta remains a separate human-approved action.
10. Later performance data is connected back to campaign, creative, lead, meeting, signup and paid outcome.

## Content rule

Website content is the factual source of truth.

The generator may reframe, shorten and reorganise approved wording, but it may not invent:

- product features
- pricing
- customer numbers
- testimonials
- integrations
- safety claims
- guarantees or outcomes

It must not use child, athlete or guardian personal data for advertising generation.

## Code foundation

`src/lib/marketing-creative.ts` now provides:

- approved website-content input types
- creative brief and draft types
- a provider interface so the AI vendor is replaceable
- source-content sanitisation and size limits
- a prompt builder that explicitly restricts factual claims to approved Factory content
- draft validation requiring at least one approved source URL

No paid AI provider is wired in yet.

## Provider / subscription decision

Do not hard-code the Marketing Lab to one AI company before validating cost and output quality.

The provider adapter should live behind `MarketingCreativeProvider`. This lets 4SPORT compare an API model on:

- cost per generated campaign
- copy quality
- structured-output reliability
- latency
- South African English quality
- ability to obey source-only factual constraints

The selected provider will require an API account/billing arrangement, but the exact provider and spend cap should be decided separately from this foundation.

## Provider guardrails

- API key remains server-side only.
- Never expose a provider secret through `VITE_*` variables.
- Set a hard monthly spend cap where supported.
- Limit variants per generation request.
- Cache/save generated drafts so the same prompt is not repeatedly billed.
- Store the model/provider name and generation timestamp for auditability.
- Generation never equals approval.
- Approval never equals automatic publishing in V1.

## Proposed next implementation slice

After the attribution PRs are validated:

1. Add a server-only endpoint/function to collect approved Factory page content.
2. Add one AI provider adapter using a server-side API key.
3. Require structured JSON output matching `MarketingCreativeDraft`.
4. Add a Generate drafts panel to `/marketing`.
5. Add approve/edit/reject controls.
6. Persist only approved creatives to `marketing_creatives`.
7. Generate the creative-specific tracked URL.

## Definition of done

A Marketing Lab admin can select an existing campaign, generate three grounded ad-copy options from approved 4SPORT Factory content, see which pages each option used, approve one option, save it as a marketing creative and obtain its tracked Factory URL — without any ad being automatically published or budget being changed.
