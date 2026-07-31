# 4SPORT Marketing Lab — Foundation

## Goal

Create the smallest useful advertising intelligence layer inside the existing 4SPORT Sales Hub. Do not create a new repo and do not duplicate CRM, lead research, meetings, signups, WhatsApp, rep management, or performance reporting.

## Architecture rule

- 4SPORT Factory remains the public website and landing-page destination.
- Meta handles paid distribution, audience optimisation, placements, and campaign-budget optimisation.
- Sales Hub owns campaign attribution, lead-to-sale tracking, and later AI analysis.
- Human approval remains required before ad spend is launched or changed in the first production version.

## First production milestone

Prove this chain end-to-end:

Campaign -> Creative -> tracked Factory URL -> Lead -> Meeting -> Signup -> Paid

Until this chain works, do not build autonomous ad buying or a large AI creative suite.

## Foundation added in this branch

`src/lib/marketing.ts` adds small shared primitives for:

- campaign metadata
- creative metadata
- campaign/creative attribution
- stable 4SPORT campaign codes
- UTM-tagged Factory landing URLs

This is deliberately database-independent so the foundation can be merged without touching the working Sales Hub data model.

## Next safe changes

1. Add additive Supabase tables for `marketing_campaigns`, `marketing_creatives`, and `marketing_results`.
2. Add nullable attribution columns to `leads` (`marketing_campaign_id`, `marketing_creative_id`, UTM source/medium/campaign/content).
3. Add an admin-only Marketing route in Sales Hub.
4. Create campaigns and tracked Factory links manually from that route.
5. Capture attribution when a prospect enters Sales Hub.
6. Join campaign data to the existing lead -> meeting -> signup pipeline.
7. Only then add AI campaign generation and AI performance recommendations.
8. Add Meta results sync and Conversions API after the attribution loop is proven.

## V1 guardrails

- No automatic budget changes.
- No automatic publishing to Meta.
- No new CRM.
- No new public website.
- No child/athlete/guardian prospecting data.
- No change to existing lead-research safety rules.
- No generated route-tree edits by hand.

## Definition of success

For a paid 4SPORT campaign, Sales Hub must be able to answer:

- Which campaign produced this lead?
- Which creative produced it?
- Did the lead become a meeting?
- Did it become a signed/paid school?
- What did acquisition cost relative to the result?

That is the data layer the later AI system will optimise against.
