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

## Foundation now in this branch

`src/lib/marketing.ts` provides the campaign/creative types, stable campaign codes and tracked Factory URL builder.

`supabase/migrations/20260731090000_marketing_lab_attribution.sql` adds:

- `marketing_campaigns`
- `marketing_creatives`
- optional attribution columns on existing `leads`
- admin-only RLS for the new marketing tables

`src/routes/_app.marketing.tsx` adds an admin-only Marketing Lab screen that can:

- create a draft campaign
- define objective, audience, message angle, budget and Factory landing page
- generate a stable campaign code
- copy a Meta-ready UTM-tagged Factory link

`src/components/AppLayout.tsx` exposes Marketing as an admin navigation item.

## Current boundary

This branch deliberately stops before changing the working lead workflow. The database can now store campaign attribution, but the public Factory CTA still uses email and does not yet capture UTM attribution into Sales Hub automatically.

## Next safe changes

1. Capture UTM values on the 4SPORT Factory landing page.
2. Carry those values into a real demo/enquiry submission instead of losing them in the current mailto flow.
3. Create/update the Sales Hub lead with campaign + creative attribution.
4. Show campaign -> lead -> meeting -> signup conversion in Marketing Lab.
5. Only then add AI campaign generation and AI performance recommendations.
6. Add Meta results sync and Conversions API after the attribution loop is proven.

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
