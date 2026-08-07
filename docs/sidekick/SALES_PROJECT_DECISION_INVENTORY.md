# 4SPORT Sales Hub — Project Decision and Evidence Inventory

**Repository:** `swanepoelchristo/4sport-sales-hub`  
**Inspection baseline:** `main` at `bc4752041e277403dd5c73e9c93fecd6d22db65d`  
**Recorded:** 2026-08-06  
**Status:** Living Product Owner decision and evidence inventory  
**Final Production Success Contract:** **No**

This inventory records confirmed Product Owner decisions separately from implementation evidence. It must be updated when new verified evidence or Product Owner decisions become available. It does not authorise repairs, migrations, deployments, or production changes.

## Classification vocabulary

| Classification | Meaning |
|---|---|
| CONFIRMED | Explicitly approved Product Owner intent or architecture. |
| IMPLEMENTED | Repository evidence shows a meaningful implementation path, subject to runtime verification. |
| PARTIAL | Meaningful implementation exists, but the complete intended outcome is incomplete or unverified. |
| ABSENT | The repository shows that the capability is not implemented. |
| CONFLICTING | Current implementation, migrations, documentation, or historical decisions disagree. |
| NO EVIDENCE | The repository does not prove the claim. |
| OUT OF SCOPE | Not part of the confirmed Sales Hub purpose unless separately approved. |

## Source-of-truth rule

Use current Product Owner instruction first. Treat repository code, routes, components, migrations, README text, and deployment notes as evidence. Do not silently promote evidence into approved intent.

---

## A. Product identity and scope

| ID | Decision or evidence | Classification | Status and rationale |
|---|---|---|---|
| SH-001 | The Sales Hub is a standalone internal 4SPORT application. | CONFIRMED | It is operationally separate from the main 4SPORT application. |
| SH-002 | The Sales Hub is not the main 4SPORT application. | CONFIRMED | Main-app roles, athlete data, fixtures, and game-day operations are not automatically Sales Hub scope. |
| SH-003 | Core purpose includes sales CRM, leads, pipeline, meetings, onboarding, WhatsApp support, support tickets, and internal staff operations. | CONFIRMED | This is the current Product Owner baseline. |
| SH-004 | Existing repository features automatically define approved scope. | CONFLICTING | Route or migration presence is evidence only; Product Owner approval remains controlling. |
| SH-005 | Impact War Room is part of the first-production Sales Hub boundary. | OUT OF SCOPE | Repository implementation exists, but approval for the first-production boundary is not established. |
| SH-006 | Marketing Lab and public attribution are part of the first-production boundary. | OUT OF SCOPE | Repository implementation exists; separate Product Owner approval is required. |
| SH-007 | These Sidekick files are the final Production Success Contract. | CONFIRMED | No. They are living knowledge and evidence inventories only. |

## B. Users and roles

| ID | Decision or evidence | Classification | Status and rationale |
|---|---|---|---|
| SH-010 | Product Owner approval governs scope, integrations, and production acceptance. | CONFIRMED | Repository evidence cannot override a current Product Owner decision. |
| SH-011 | The two designated back-office accounts use the existing `admin` role. | CONFIRMED | Current operating model: `info@4sport.co.za` and `support@4sport.co.za` are administrators. Runtime linkage still needs verification. |
| SH-012 | Sales representatives use `sales_rep`. | IMPLEMENTED | Types, UI filtering, data access patterns, and migrations contain this role. |
| SH-013 | Call-centre agents use `call_center_agent`. | PARTIAL | Signup, profile table, approval status, lead scope, and activity foundation exist; production activation flow is unverified. |
| SH-014 | Christo requires a separate permanent `support` role. | CONFLICTING | Historical migrations added `support`; the later agreed model assigns both back-office accounts `admin`. |
| SH-015 | Front-end navigation is sufficient role enforcement. | CONFLICTING | Database and server-side authorisation must be the actual boundary. |
| SH-016 | Support operator identity is reliably derived from the authenticated user. | CONFLICTING | The inspected support UI allowed a selectable staff name, weakening audit reliability. |

## C. Product Owner workflow

| ID | Decision or evidence | Classification | Status and rationale |
|---|---|---|---|
| SH-020 | Leads enter through approved public organisation intake paths. | CONFIRMED | Intake must remain POPIA-aware and organisation-focused. |
| SH-021 | Leads are reviewed, assigned, contacted, and progressed in the CRM. | CONFIRMED | Core Sales Hub workflow. |
| SH-022 | Contact outcomes, notes, and follow-ups must be recorded. | CONFIRMED | Required for pipeline control and accountability. |
| SH-023 | Meetings must be scheduled and recorded. | CONFIRMED | Internal meeting records are core scope. |
| SH-024 | Qualified organisations move into signup and onboarding administration. | CONFIRMED | The exact final onboarding contract remains open. |
| SH-025 | WhatsApp is a human-triage channel, not an uncontrolled chatbot. | CONFIRMED | Messages are routed into approved human workflows. |
| SH-026 | Support tickets require queue, severity, ownership, SLA, notes, status, and resolution. | CONFIRMED | Required operational support shape. |
| SH-027 | A route named “calendar” or a meeting screen proves external calendar integration. | NO EVIDENCE | Internal meeting scheduling exists; external calendar sync is not proven. |

## D. Deployment architecture

| ID | Decision or evidence | Classification | Status and rationale |
|---|---|---|---|
| SH-030 | Intended deployment flow is GitHub → Ubuntu production server → Coolify → production. | CONFIRMED | This is the approved deployment architecture. |
| SH-031 | The current production domain can be taken from historical documentation. | CONFLICTING | The exact target must be verified from current Coolify and runtime evidence. |
| SH-032 | The exact deployed branch and commit are known from repository inspection. | NO EVIDENCE | Repository inspection does not prove what Coolify currently runs. |
| SH-033 | Repository contains production Docker/Nitro deployment configuration. | PARTIAL | Dockerfile, Compose/Traefik intent, runtime command, and health route exist. Actual use is unverified. |
| SH-034 | A repository CI/CD workflow proves build and deployment. | ABSENT | No current `.github/workflows` pipeline was found on the inspected `main`. |
| SH-035 | `/api/health` proves full production health. | CONFLICTING | It proves application liveness only and does not test Supabase, WhatsApp, storage, Brave, or migrations. |
| SH-036 | A known rollback target is required before deployment. | CONFIRMED | Production changes must remain reversible. |

## E. Database and integration boundaries

| ID | Decision or evidence | Classification | Status and rationale |
|---|---|---|---|
| SH-040 | Sales Hub uses, or must use, a dedicated Supabase project. | CONFIRMED | This is a non-negotiable architecture boundary. |
| SH-041 | The currently referenced Supabase project is proven separate from main 4SPORT production. | NO EVIDENCE | Repository project references do not prove runtime database ownership or separation. |
| SH-042 | Sales Hub may write directly to main 4SPORT production by default. | CONFIRMED | No. Direct writes are prohibited unless a specific integration is approved. |
| SH-043 | An approved main-app integration requires defined ownership, fields, direction, auth, RLS review, failure behaviour, audit, rollback, and production approval. | CONFIRMED | Minimum integration contract. |
| SH-044 | A migration file proves the migration is applied in production. | NO EVIDENCE | Applied migration state requires database evidence. |
| SH-045 | The support schema is reproducible from version-controlled migrations. | CONFLICTING | Inspection did not clearly find creation of the base `support_tickets` table, although later migrations reference it. |
| SH-046 | Service-role usage may rely on hidden internal UI routes. | CONFLICTING | Service-role routes bypass RLS and require explicit server-side authentication and authorisation. |

## F. CRM and lead workflow evidence

| ID | Decision or evidence | Classification | Status and rationale |
|---|---|---|---|
| SH-050 | Lead create, edit, assign, filter, follow-up, status, archive, and public-source fields exist. | IMPLEMENTED | Meaningful repository implementation was inspected. |
| SH-051 | Lead call outcomes and lead activity exist. | IMPLEMENTED | Database foundation and UI flow are present. |
| SH-052 | Meeting creation, status, outcome, next action, and filtering exist. | IMPLEMENTED | Internal meeting workflow is substantial. |
| SH-053 | Signup and commission records exist. | PARTIAL | Screens and calculations exist; they do not establish a final approved onboarding or accounting contract. |
| SH-054 | Public-source lead research and candidate review exist. | IMPLEMENTED | Admin-gated provider search, filtering, enrichment, and candidate persistence are present. |
| SH-055 | Lead attachments use a private storage model. | PARTIAL | Bucket, signed URL, and RLS policy evidence exist; production bucket configuration and file restrictions remain unverified. |
| SH-056 | CSV export exists. | IMPLEMENTED | Repository contains export actions. |
| SH-057 | CSV import is complete. | PARTIAL | UI presentation exists, but the inspected flow is not completed. |
| SH-058 | Formal onboarding workflow transitions are enforced. | ABSENT | The repository describes workflow state machines as informational only. |

## G. WhatsApp and support evidence

| ID | Decision or evidence | Classification | Status and rationale |
|---|---|---|---|
| SH-060 | Inbound WhatsApp webhook parsing and inbox persistence exist. | IMPLEMENTED | Handler and persistence path are present. |
| SH-061 | Internal WhatsApp inbox and human triage UI exist. | IMPLEMENTED | Messages can be viewed and categorised. |
| SH-062 | WhatsApp messages can create support tickets. | IMPLEMENTED | Conversion path exists in the internal API. |
| SH-063 | WhatsApp inbox API caller authentication is demonstrated. | CONFLICTING | The inspected API uses a service-role client without demonstrated caller authentication. |
| SH-064 | Meta webhook POST authenticity is verified. | CONFLICTING | Subscription challenge-token verification exists, but POST request-signature verification was not demonstrated. |
| SH-065 | Live WhatsApp number, Meta app, tokens, and delivery are verified. | NO EVIDENCE | Runtime and external-provider verification were not part of repository inspection. |
| SH-066 | Support queue, SLA, severity, notes, status, and activity UI exist. | IMPLEMENTED | Substantial operational screen exists. |
| SH-067 | Support activity RLS is least privilege. | CONFLICTING | Inspected policies included unrestricted `using (true)` and `with check (true)`. |
| SH-068 | Support audit identity is trustworthy. | CONFLICTING | Operator name could be selected rather than reliably derived from the session user. |
| SH-069 | Support base-table migration history is complete. | CONFLICTING | Clean creation of `support_tickets` was not proven. |

## H. Authentication, staff management, and security evidence

| ID | Decision or evidence | Classification | Status and rationale |
|---|---|---|---|
| SH-070 | Supabase password login, sessions, profiles, and role resolution exist. | PARTIAL | Code paths exist; exact production login state remains runtime evidence. |
| SH-071 | Admin account invitation, password reset, role update, activation, and account linkage functions exist. | PARTIAL | Server functions are substantial; production authorisation and role consistency need verification. |
| SH-072 | Call-centre invite code is a secure secret. | CONFLICTING | It was embedded in client-visible source and should not be treated as a security boundary. |
| SH-073 | A tracked `.env` file exists in the public repository tree. | CONFLICTING | Its values were not inspected or exposed; presence itself is a security concern. |
| SH-074 | `.gitignore` fully prevents environment files from being committed. | CONFLICTING | Inspection did not find complete `.env` exclusions in `.gitignore`. |
| SH-075 | Environment-variable documentation is internally consistent. | CONFLICTING | Server middleware required a non-VITE publishable key not clearly documented in `.env.example`. |
| SH-076 | Production auth diagnostics avoid profile/session exposure. | CONFLICTING | The inspected store logged session and profile query diagnostics. |
| SH-077 | The System Check is read-only. | CONFLICTING | It creates and edits records, writes activity, attempts RLS writes, and sends a password-reset email. |
| SH-078 | Notifications are operational. | ABSENT | Notification interfaces exist, but the transport is a no-op returning `not_configured`. |
| SH-079 | Secret values may be copied into documentation for completeness. | CONFIRMED | No. Secret values must never be exposed. |

## I. RLS, storage, and production readiness

| ID | Decision or evidence | Classification | Status and rationale |
|---|---|---|---|
| SH-080 | Core tables contain meaningful RLS policy evidence. | PARTIAL | Admin, rep, and call-centre policy foundations exist, but policy history is conflicting. |
| SH-081 | Legacy `support` policies are conclusively removed from production. | NO EVIDENCE | Later admin-only helper does not prove all historical policies are absent or unapplied. |
| SH-082 | Front-end filtering and RLS are equivalent. | CONFLICTING | RLS is the required database boundary; front-end filtering is supplementary. |
| SH-083 | Lead attachment bucket is intended to be private. | IMPLEMENTED | Migration and component use a private bucket and signed URLs. |
| SH-084 | Attachment file-size and type controls are verified. | NO EVIDENCE | Component upload exists; comprehensive production restrictions were not established. |
| SH-085 | Production-readiness checklists prove production readiness. | CONFLICTING | Checklists are instructions, not passed evidence. |
| SH-086 | The inspected repository is production-ready. | CONFLICTING | Serious security, migration, pipeline, environment, and runtime-verification gaps remain. |

---

## Confirmed implementation snapshot

| Area | Classification |
|---|---|
| Lead management | IMPLEMENTED |
| Lead research and candidate inbox | IMPLEMENTED |
| Meetings | IMPLEMENTED |
| Basic health endpoint | IMPLEMENTED |
| Private lead attachments | PARTIAL |
| Authentication | PARTIAL |
| Signups/onboarding | PARTIAL |
| Staff management | PARTIAL |
| WhatsApp | CONFLICTING |
| Support tickets | CONFLICTING |
| Roles and RLS | CONFLICTING |
| Notifications | ABSENT |
| CI/CD pipeline | ABSENT |
| Verified Ubuntu/Coolify deployment state | NO EVIDENCE |
| Verified dedicated production Supabase separation | NO EVIDENCE |
| Impact War Room in first-production scope | OUT OF SCOPE |
| Marketing Lab in first-production scope | OUT OF SCOPE |

---

## Open Product Owner questions

| ID | Question | Current classification |
|---|---|---|
| OQ-001 | Which exact Supabase project is production, and is it separate from main 4SPORT production? | NO EVIDENCE |
| OQ-002 | Which branch and commit is currently deployed by Coolify? | NO EVIDENCE |
| OQ-003 | What is the verified production domain and Coolify application identity? | NO EVIDENCE |
| OQ-004 | Which database migrations have actually been applied? | NO EVIDENCE |
| OQ-005 | Where was `support_tickets` originally created, and can the schema be replayed cleanly? | CONFLICTING |
| OQ-006 | Which legacy `support` policies remain active? | NO EVIDENCE |
| OQ-007 | Is webhook POST signature verification configured elsewhere? | NO EVIDENCE |
| OQ-008 | Which WhatsApp number and Meta application are approved for production? | NO EVIDENCE |
| OQ-009 | Are Impact War Room and Marketing Lab approved future Sales Hub modules? | OUT OF SCOPE |
| OQ-010 | Is external calendar integration required? | NO EVIDENCE |
| OQ-011 | Which notification transports are required for first production? | NO EVIDENCE |
| OQ-012 | What retention, backup, deletion, and POPIA rules apply to each Sales Hub data class? | NO EVIDENCE |
| OQ-013 | Which automated checks must pass before deployment approval? | NO EVIDENCE |

---

## First-production boundary

**Classification:** CONFIRMED as the proposed minimum boundary; final acceptance still requires Product Owner approval.

First production should be limited to an internal, standalone Sales Hub that has:

- a verified dedicated Supabase project;
- approved authenticated users and roles;
- Product Owner-selected core CRM, meeting, signup/onboarding, WhatsApp-triage, and support-ticket functions;
- server-side authorisation and least-privilege RLS;
- audit identity derived from authenticated sessions;
- no direct writes into main 4SPORT production;
- no secret exposure;
- authenticated service-role routes;
- verified webhook authenticity;
- reproducible migrations;
- a verified deployed commit, liveness check, smoke-test plan, backup, and rollback target.

Impact War Room, Marketing Lab expansion, external calendar sync, automated notifications, and main-database integration are excluded unless specifically approved.

## Smallest recommended next action

Perform a single read-only production evidence capture after this documentation PR is reviewed:

1. identify the exact Coolify application, branch, and deployed commit;
2. identify the runtime domain and container/build configuration;
3. capture environment-variable names only;
4. verify the dedicated Supabase project boundary;
5. record applied migration/schema state;
6. record current role and RLS shape;
7. check `/api/health` without running the write-capable System Check.

Do not deploy, migrate, repair, expose secrets, or change production data. Update this inventory with the evidence and wait for Product Owner approval before any repair plan.
