# 4SPORT Sales Hub — Product Owner Flow

**Repository:** `swanepoelchristo/4sport-sales-hub`  
**Knowledge status:** Living Product Owner knowledge  
**Inspection baseline:** `main` at `bc4752041e277403dd5c73e9c93fecd6d22db65d`  
**Recorded:** 2026-08-06  
**Final Production Success Contract:** **No**

This file preserves confirmed Product Owner intent and the evidence produced by the completed repository inspection. It is a living reference for future Sidekick work. It is not permission to deploy, repair, migrate, or change production.

## Classification vocabulary

- **CONFIRMED** — explicitly approved Product Owner intent or architecture.
- **IMPLEMENTED** — repository evidence shows a working implementation path, subject to runtime verification.
- **PARTIAL** — meaningful implementation exists, but the full intended outcome is incomplete or unverified.
- **ABSENT** — the inspected repository contains evidence that the capability is not implemented.
- **CONFLICTING** — implementation, documentation, migrations, or historical decisions disagree.
- **NO EVIDENCE** — the repository does not prove the claim.
- **OUT OF SCOPE** — not part of the confirmed Sales Hub purpose unless separately approved.

A route, component, migration, table name, document, or dashboard is evidence only. It does not automatically prove runtime functionality or Product Owner approval.

---

## 1. Product purpose

### CONFIRMED

The 4SPORT Sales Hub is a **standalone internal 4SPORT application**. It is not the main 4SPORT application.

Its confirmed purpose is to support:

- school sales CRM;
- lead capture and lead management;
- sales-pipeline management;
- meeting scheduling and meeting records;
- customer onboarding and signup operations;
- WhatsApp support intake and human triage;
- support-ticket handling;
- internal sales, support, call-centre, and staff operations.

The Sales Hub must remain operationally and technically separated from the main 4SPORT product unless the Product Owner explicitly approves an integration.

### OUT OF SCOPE unless separately approved

The following repository areas are not automatically part of the confirmed first Sales Hub boundary:

- Impact War Room;
- Marketing Lab and public marketing-attribution expansion;
- main 4SPORT product features;
- athlete, guardian, coach, school, fixture, or game-day operational data owned by the main 4SPORT application;
- automatic writes into the main 4SPORT production database;
- unrelated public-facing product experiences.

Their presence in the repository is implementation evidence, not final Product Owner approval.

---

## 2. Confirmed users and roles

### Product Owner

**Classification:** CONFIRMED

The Product Owner controls product intent, scope, production boundaries, integration approval, and the final Production Success Contract. Repository evidence cannot override an explicit Product Owner decision.

### Back-office administrators

**Classification:** CONFIRMED operating model; runtime remains subject to verification

The current agreed back-office model uses the existing `admin` role for both designated back-office accounts:

- `info@4sport.co.za` — Marianne back-office administrator;
- `support@4sport.co.za` — Christo back-office administrator.

Administrators are intended to have full authorised internal access to Sales Hub operations, subject to database policy and runtime verification.

### Sales representatives

**Classification:** CONFIRMED and IMPLEMENTED in repository evidence

Role: `sales_rep`

Sales representatives work with assigned leads, meetings, signups, follow-ups, and related sales records. They must not gain unrestricted back-office access merely through front-end navigation.

### Call-centre agents

**Classification:** CONFIRMED and PARTIAL

Role: `call_center_agent`

Call-centre agents are intended to work with public organisation contact information, assigned or unassigned call queues, call outcomes, notes, and follow-ups. Activation or approval must occur before operational access is granted.

### Support operators

**Classification:** CONFIRMED as a business function; CONFLICTING as a technical role

Support work is a confirmed Sales Hub function. The agreed back-office role model does not require a separate permanent `support` application role for Christo. Historical migrations added a `support` enum value and policies, while later implementation moved the two designated back-office users to `admin`. This remains unresolved evidence and must not be silently normalised in documentation.

---

## 3. Product Owner workflow

### CONFIRMED operating flow

1. A public organisation or school becomes a lead through an approved intake path.
2. The lead is reviewed, recorded, assigned, and progressed through the Sales Hub CRM.
3. A sales representative or call-centre agent performs approved contact and records the outcome.
4. Follow-ups and meetings are scheduled and recorded.
5. Interested organisations move through signup and onboarding administration.
6. WhatsApp messages are received into a human triage inbox; the Sales Hub is not intended to become an uncontrolled chatbot.
7. A WhatsApp message may be routed to support or sales handling.
8. Support requests become support tickets with queue, severity, ownership, SLA, notes, and resolution tracking.
9. Internal administrators manage authorised staff accounts, assignments, operational oversight, and audit evidence.
10. No workflow may write directly to the main 4SPORT production database without a separately approved integration contract.

### Evidence rule

Repository evidence may show only part of this flow. Each stage must be classified separately rather than assuming an end-to-end workflow exists because all screen names are present.

---

## 4. Source-of-truth rules

### CONFIRMED precedence

When sources disagree, use this order:

1. explicit current Product Owner instruction;
2. the future approved Production Success Contract;
3. these Sidekick Product Owner knowledge files;
4. verified production evidence captured read-only;
5. current repository implementation evidence;
6. migrations and generated types;
7. current operational runbooks;
8. historical README text, old PR descriptions, old handovers, route names, and comments.

### Mandatory interpretation rules

- Do not treat the README as the final product contract.
- Do not infer a production domain, branch, database, container, or server path from stale documentation.
- Do not infer that a migration was applied merely because it exists.
- Do not infer that a route works merely because it builds or appears in navigation.
- Do not infer RLS safety from front-end filtering.
- Do not treat existing features as approved scope without Product Owner confirmation.
- Preserve contradictions as `CONFLICTING` until evidence or a Product Owner decision resolves them.
- Never expose secret values in documentation, logs, issues, commits, or chat.

---

## 5. Deployment architecture

### CONFIRMED architecture

```text
GitHub repository
        ↓
Ubuntu production server
        ↓
Coolify
        ↓
Sales Hub production runtime
```

The repository is the intended code source. Coolify is the intended deployment control plane on the Ubuntu production server.

### Deployment-target rule

**Classification:** CONFIRMED

The exact production domain, Coolify application, server working directory, container, branch, and deployed commit must be verified from current read-only production evidence. They must not be guessed from old or conflicting documentation.

### Repository evidence

**Classification:** PARTIAL

The repository contains a production Dockerfile, Docker Compose/Traefik configuration, a Node/Nitro runtime command, and a basic health endpoint. These prove deployment intent, not the currently deployed state.

### Deployment pipeline

**Classification:** ABSENT / NO EVIDENCE

The completed inspection found no current `.github/workflows` deployment or verification pipeline on the inspected `main`. A manual or Coolify-triggered deployment may exist externally, but the repository does not prove it.

---

## 6. Database boundaries

### CONFIRMED boundary

The Sales Hub uses, or must use, a **dedicated Supabase project**.

The Sales Hub must not write directly to the main 4SPORT production database unless all of the following exist:

1. a specific Product Owner-approved integration purpose;
2. defined source and destination ownership;
3. documented fields and direction of data flow;
4. authentication and authorisation controls;
5. RLS/service-role review;
6. failure and retry behaviour;
7. audit logging;
8. rollback or disablement procedure;
9. production verification approval.

### Current evidence

**Classification:** NO EVIDENCE

The repository contains a Supabase project reference and Supabase clients, but repository inspection alone does not prove that the referenced or deployed project is dedicated and separate from the main 4SPORT production project.

### Service-role rule

The Supabase service-role key is server-only and bypasses RLS. Any route using it must have explicit server-side authentication, authorisation, input validation, auditability, and abuse controls. A browser-side hidden button is not a security boundary.

---

## 7. WhatsApp and support workflow

### Confirmed intent

**Classification:** CONFIRMED

- WhatsApp is an intake and human-triage channel.
- The inbox must support operational routing rather than uncontrolled chatbot behaviour.
- A message may be assigned to sales, support, Game Day Operations, billing, or another approved queue.
- A support message may create a support ticket.
- Support tickets require ownership, SLA, notes, status, and traceable staff actions.

### Repository implementation evidence

**Classification:** PARTIAL / CONFLICTING

The inspected repository contains:

- webhook verification and inbound message parsing;
- persistence to a WhatsApp inbox table;
- an internal WhatsApp inbox screen;
- manual test-message creation;
- message category/status updates;
- WhatsApp-to-support-ticket conversion;
- support ticket listing, creation, filtering, SLA presentation, notes, and activity rows.

### Unresolved evidence

The inspection identified serious gaps that remain unresolved:

- the WhatsApp inbox API uses a service-role client without demonstrated caller authentication;
- the webhook POST handler does not demonstrate Meta request-signature verification;
- support staff identity can be selected in the UI rather than being derived reliably from the authenticated user;
- support activity RLS contains unrestricted `using (true)` / `with check (true)` policies;
- the migration history did not clearly prove clean creation of the base `support_tickets` table;
- live webhook configuration, phone-number ownership, token validity, and end-to-end delivery were not verified.

These findings are evidence only. This documentation commit does not repair them.

---

## 8. CRM and lead workflow

### Confirmed intent

**Classification:** CONFIRMED

The CRM must allow authorised staff to:

- capture a school, club, academy, or approved organisation lead;
- record public contact routes and source evidence;
- assign a lead to the correct sales or call-centre owner;
- record contact attempts, outcomes, notes, and next follow-up;
- schedule and record meetings;
- move a qualified opportunity into signup/onboarding administration;
- preserve an audit trail;
- respect do-not-contact and privacy constraints.

### Confirmed implementation evidence

**Classification:** IMPLEMENTED, subject to runtime and RLS verification

The repository contains meaningful implementation for:

- lead create/edit/archive flows;
- lead ownership and filtering;
- lead statuses and follow-up dates;
- public-source contact fields;
- call outcomes and lead activity;
- meeting creation and filtering;
- signup and commission data screens;
- CSV export;
- private lead attachments;
- admin account management;
- public-source lead research and a candidate review inbox.

### Partial or conflicting areas

- CSV import is presented but not implemented as a completed workflow.
- notification reminders are not wired to a real transport.
- formal onboarding state-machine enforcement is explicitly informational only.
- calendar capability is meeting scheduling rather than a proven full calendar or external calendar integration.
- signup and commission screens do not by themselves prove an approved accounting, payment, or onboarding process.
- Marketing Lab attribution exists as repository evidence but remains outside the confirmed first Sales Hub boundary unless separately approved.

---

## 9. Security guardrails

### CONFIRMED non-negotiable rules

- Never modify production during an inspection.
- Never change production data without an explicitly approved change plan.
- Never expose secret values.
- Never place service-role, webhook, provider, or private API secrets in browser-visible variables.
- Never rely on front-end visibility as authorisation.
- Never bypass verification because a route, migration, or dashboard appears complete.
- Use least privilege for every role and API.
- Authenticate and authorise every internal write path.
- Verify webhook authenticity, not only webhook-subscription challenge tokens.
- Derive audit identity from the authenticated user.
- Preserve POPIA-aware use of public organisation contact information.
- Do not use child, athlete, guardian, leaked, hidden, or questionable personal information for prospecting.
- Keep the Sales Hub database isolated from the main 4SPORT production database unless an integration is explicitly approved.
- Review migrations separately before applying them.
- Keep a known rollback target before deployment.

### Unresolved security evidence from inspection

**Classification:** CONFLICTING

- A tracked `.env` file exists in the public repository tree; its contents were not exposed during inspection.
- `.gitignore` did not demonstrate complete `.env` exclusion.
- unauthenticated or insufficiently authenticated service-role API paths were identified.
- webhook signature verification was not demonstrated.
- a call-centre invite code was embedded in client-visible source.
- support audit attribution was not reliably tied to the session user.
- support activity RLS was overly broad.
- legacy `support` role policies conflict with the later admin-only back-office model.
- environment-variable documentation conflicts with server middleware requirements.
- production authentication code logs profile/session diagnostic information.
- the System Check performs writes and sends a password-reset email; it is not a passive production inspection.

No item in this section is resolved by the presence of this document.

---

## 10. Confirmed implementation summary

The completed repository inspection found substantial implementation rather than empty placeholders.

| Capability | Classification | Summary |
|---|---|---|
| Supabase authentication | PARTIAL | Password login, session recovery, profiles, and role resolution exist; production behaviour remains unverified. |
| Lead management | IMPLEMENTED | Create, edit, assign, filter, follow up, archive, call outcomes, and public-source fields. |
| Lead research | IMPLEMENTED | Admin-gated Brave search, quality screening, public contact enrichment, and candidate persistence. |
| Meetings | IMPLEMENTED | Meeting scheduling/recording, status, outcome, next action, and filtering. |
| Signups/onboarding | PARTIAL | Signup and commission records exist; enforced onboarding workflow is not proven. |
| WhatsApp inbox | PARTIAL / CONFLICTING | Intake and triage exist, with serious authentication and verification gaps. |
| Support tickets | PARTIAL / CONFLICTING | Operational UI exists, with schema, audit, and RLS concerns. |
| Staff management | PARTIAL | Admin invites, role updates, activation, and resets exist; role history conflicts remain. |
| Notifications | ABSENT | Interface and no-op channel only; no real transport is wired. |
| Storage | PARTIAL | Private lead-attachment bucket and signed URLs exist; production configuration and file controls remain unverified. |
| Health endpoint | IMPLEMENTED | Basic process-liveness response only; it does not prove dependency health. |
| CI/CD pipeline | ABSENT / NO EVIDENCE | No repository workflow proved build, test, or deployment on the inspected main branch. |

---

## 11. Partial or conflicting implementation

The following must remain visible to future Sidekick work:

1. The README is historical evidence and conflicts with newer role, account, runtime, and deployment information.
2. The current agreed back-office model is admin-only for the two designated accounts, while historical migrations retain a `support` role and direct support policies.
3. The repository contains deployment configuration, but actual Ubuntu/Coolify state was not established by the code inspection.
4. The repository references a Supabase project, but dedicated-database separation was not proven.
5. WhatsApp and support features are substantial but do not meet an accepted security boundary based on current evidence.
6. The support schema cannot be assumed reproducible from a clean migration run until the base-table history is verified.
7. Build scripts exist, but there was no current automated build/type-check result for the inspected `main` during the completed inspection.
8. The health endpoint is liveness only and must not be described as full production health.
9. Routes for Impact and Marketing exist, but their scope approval is not established by route presence.
10. Existing Production Readiness documentation is a checklist, not proof that the checklist passed.

---

## 12. Open questions

1. Which exact Supabase project is the Sales Hub production project, and is it conclusively separate from the main 4SPORT production project?
2. Which exact GitHub branch and commit is currently deployed by Coolify?
3. What is the verified current production domain and Coolify application identity?
4. Is production deployed from the repository Dockerfile, Compose configuration, or a different Coolify build configuration?
5. Which migrations have actually been applied to the dedicated Sales Hub database?
6. Where was the base `support_tickets` table created, and can a clean database be reproduced from version-controlled migrations?
7. Which legacy `support` policies remain active in production?
8. Are all service-role routes authenticated and authorised at runtime?
9. Is Meta webhook POST signature verification configured outside the inspected handler, or is it absent?
10. Which WhatsApp number and Meta application are approved for production use?
11. What exact functions are included in the first production Sales Hub boundary?
12. Are Impact War Room and Marketing Lab approved Sales Hub modules, separate future modules, or out of scope?
13. Is an external calendar integration required, or is internal meeting scheduling sufficient?
14. Which notification channels are required for first production, and who approves their cost and provider?
15. What retention, backup, deletion, and POPIA processes apply to leads, WhatsApp payloads, tickets, and attachments?
16. Which automated checks must pass before a deployment can be approved?

---

## 13. First-production boundary

### Proposed minimum boundary requiring Product Owner approval

The smallest responsible first-production boundary is an **internal-only Sales Hub** that:

- runs as a standalone application;
- uses a verified dedicated Supabase project;
- authenticates approved administrators and sales staff;
- supports the core lead, follow-up, meeting, signup/onboarding, WhatsApp triage, and support-ticket workflows selected by the Product Owner;
- enforces server-side role and RLS boundaries;
- derives audit identity from authenticated users;
- has no direct writes to the main 4SPORT production database;
- exposes no secret values;
- has authenticated service-role routes and verified webhook authenticity;
- has a reproducible migration path;
- has a known deployment commit, health check, smoke test, backup, and rollback target.

The current repository inspection does not prove that all these conditions are met.

### Explicit exclusions from automatic first-production acceptance

- Impact War Room;
- Marketing Lab expansion;
- external calendar sync;
- automated notifications;
- automated main-4SPORT database integration;
- any capability whose security or data ownership is unverified.

---

## 14. Smallest recommended next action

**Classification:** CONFIRMED recommendation; no production change

After this documentation-only pull request is reviewed, perform one controlled **read-only production evidence capture** covering:

1. the exact Coolify application, branch, and deployed commit;
2. the exact runtime domain and container/build configuration;
3. environment-variable names only, never values;
4. the Supabase project identity and proof that it is separate from main 4SPORT production;
5. the applied migration list/schema version;
6. the current authentication/RLS shape for the approved roles;
7. the actual availability of `/api/health` without running write-capable System Check actions.

The output should update the evidence inventory only. It must not deploy, repair, migrate, or change production data without a later Product Owner-approved plan.
