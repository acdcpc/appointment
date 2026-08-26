# Rainbow Child Development Clinic — Agent Handoff

## Mission and product boundary

This repository contains a parent-facing mobile and web application for **Rainbow Child Development Clinic**, focused on appointments and schedule coordination with one clinician: **Associate Professor Dr. Anil Ojha, MBBS, MD, FCCH, Developmental Pediatrician**. The app is for pediatric and child-development visits. Keep the experience calm, trustworthy, bilingual, and low-decision for Nepali families.

The product has three operational audiences: parents or guardians booking and managing a child’s visits; Dr. Ojha as the clinic administrator and clinician; and the designated super-admin, **thisispratha@gmail.com**, who governs source, server, database, access, maintenance, and release operations. The clinic administrator is **anilrajojha@pahs.edu.np**. Do not broaden the product into a multi-clinician marketplace unless the owner explicitly changes scope.

All new work must preserve the “free-of-cost” constraint. Do not add paid SMS, WhatsApp APIs, email APIs, map APIs, AI API keys, or other billable integrations without explicit approval. Existing built-in platform capabilities may be used when already configured, but do not ask the owner for an external API key when a free local or review-first flow is sufficient.

## User experience and design source of truth

Use `design.md` as the content-specific visual and interaction source of truth. The target is a first-party iOS-like mobile portrait experience with one-handed use, generous touch targets, clear hierarchy, readable line heights, and no unnecessary decisions. Nepali is the first-use presentation default; the persistent English/Nepali toggle is available in the main navigation and the saved preference must be respected on later launches.

Use the existing healthcare palette and runtime tokens rather than inventing a new theme. The visual language is navy/teal trust, warm coral action emphasis, soft aqua surfaces, green success states, amber notices, and red error states. Keep credentials and clinic identity visible in trust-building areas. The public provisional address is **Patan Hospital, Lagankhel, Lalitpur** until the clinic changes it through the authorized settings flow. The official clinic phone is **9765002862**, the clinic email is **rainbowclinic25@gmail.com**, and the configured public map link is the Rainbow Child Development Clinic location supplied by the owner.

The recurring clinic hours are Wednesday **11:00–17:00**, Saturday **17:00–19:00**, and all other days **17:30–20:00**, subject to breaks, holidays, and date-specific clinician overrides. Never imply an appointment is available when the server-side schedule rules exclude it. Modified-hour notices are informational and must state that the appointment is not changed automatically.

## Parent flows

The home screen presents the child context, upcoming appointment, Dr. Ojha credentials, booking CTA, appointment confirmation, preparation guidance, waitlist or earlier-slot actions, direct call, WhatsApp deep link, directions, About, records, and profile actions. Every action must have visible feedback and must not be a dead end.

The booking flow in `app/booking.tsx` is bilingual and intentionally low-friction. It presents canonical service cards with final Nepali translations, local search, concise visit-topic filters, a reversible compact-device preview, grouped available time slots by Morning/Afternoon/Evening, optional details, review, and success. A no-match state includes a bounded **Suggest a Service** flow. A suggestion is not an appointment, clinical request, or promise; it must not invite PHI. Optional email notification preference requires explicit consent and is review-only.

After successful booking, the confirmation screen offers user-initiated sharing and a local clipboard copy action. Copy only the clinic name, public clinician designation, service, date, time, and selected child display name. Show bilingual success or failure feedback. Never copy internal IDs, tokens, clinical notes, or secret data.

The phone-plus-OTP screen at `app/parent-auth.tsx` is a **frontend-only mockup**. It demonstrates phone entry, request-code, six-digit entry, edit-number, resend-preview, and completion states, but it must clearly state that no SMS was sent and no account was authenticated. Do not describe this as secure identity verification. Replacing it with real guardian identity verification requires an explicit production architecture decision, abuse controls, and a compliant delivery mechanism.

Parents can view appointments, records, prescriptions, growth history, referral summaries, acknowledgement states, and appointment-change messages. Report sharing and reminders are clinician-reviewed or review-first unless an explicitly approved production notification system is later implemented. Appointment changes must be acknowledged separately from attendance confirmation.

## Clinician and staff flows

Dr. Ojha signs in through the existing Manus OAuth-based protected flow and uses `app/clinician.tsx`. The dashboard includes appointment schedule/calendar views, durable appointment creation and rescheduling, conflict warnings with resolution actions, service-specific preparation checklists, patient search and filters, child timelines, growth charts with non-diagnostic WHO reference context, prescription and history review, referral templates, specialist address book, contact approval, staff invitations and roles, audit logs, retention/archive controls, waitlist triage, offer duration settings, capacity targets, reminders as drafts, exports, and deployment feedback.

The staff model supports authenticated staff accounts and role-specific access, but the product’s authority boundary remains strict. The clinic administrator may manage approved clinic workflows through the UI but must not gain database, source-control, server-configuration, maintenance-governance, or unrestricted export authority. Staff actions must be attributed and auditable. Any message, email, reminder, referral share, or report delivery that is not actually sent must be labelled as a draft, prepared, queued, or review-only.

## Super-admin governance

`app/super-admin.tsx` is restricted to the designated super-admin. The super-admin is the only role allowed to inspect or change database and server-side governance, source-control/release state, maintenance mode, application access flags, staff lifecycle, protected exports, retention policies, review schedules, and operational audit evidence. Access changes require deliberate confirmation. Deactivation revokes operational access while preserving historical evidence; reactivation must be supervised and must not erase the prior revocation trail.

The super-admin dashboard includes system status, Admin/Super-Admin role badges, access review reminders, activity and audit views, export-register search, appointment CSV preparation, maintenance mode, estimated completion time, environment/version details, deployment feedback review, screenshot acknowledgement, maintenance email-preference management, bounded filters, and bulk status actions. CSV exports are confidential preparation artifacts with retention and safe-storage guidance. Do not claim that a generated file was delivered, viewed, remotely deleted, or securely retained unless the system has evidence for that claim.

## Technical architecture

The project is an Expo SDK 54 mobile/web application using React Native 0.81, React 19, Expo Router 6, TypeScript 5.9, NativeWind 4, React Native Reanimated 4, tRPC 11, Drizzle ORM, and a MySQL/TiDB-compatible database. The main project is `/home/ubuntu/appointment`.

Use `ScreenContainer` for screen layout and Safe Area handling. Use `StyleSheet.create()` or documented NativeWind tokens. Do not put `className` on `Pressable`; use the `style` prop. Map new icons in `components/ui/icon-symbol.tsx` before using them. Prefer `AsyncStorage` for local-only state and the existing tRPC/database paths for cross-device durable records. Use `expo-file-system/legacy` where the SDK guidance requires it. Use `FlatList` for long lists.

Important project areas are:

| Area | Files and purpose |
|---|---|
| Parent UI | `app/(tabs)/index.tsx`, `app/booking.tsx`, `app/(tabs)/appointments.tsx`, `app/(tabs)/records.tsx`, `app/(tabs)/profile.tsx`, `app/about.tsx`, `app/parent-auth.tsx` |
| Clinician UI | `app/clinician.tsx`, `app/report-acknowledgement.tsx`, `app/deployment-feedback.tsx` |
| Governance UI | `app/super-admin.tsx` and `components/super-admin-service-suggestions.tsx` |
| Providers and local domain | `app/_layout.tsx`, `lib/pediatric-care.tsx`, `lib/language-preference.tsx`, `lib/child-record-pdf.ts` |
| Server/API | `server/routers.ts`, `server/db.ts`, `server/clinic-authority.ts`, audit/archive and reminder modules under `server/` |
| Schema/migrations | `drizzle/schema.ts`, `drizzle/relations.ts`, `drizzle/*.sql` through migration `0033_loving_la_nuit.sql` |
| Shared theme | `theme.config.js`, `theme.config.d.ts`, `constants/theme.ts`, `lib/_core/theme.ts`, `design.md` |
| Documentation | `README.md`, `docs/PRODUCTION_DEPLOYMENT_AND_LIVE_AUTH_VERIFICATION.md`, `docs/NEPALI_PARENT_USABILITY_GAP_REPORT.md` |
| Verification | `tests/*.test.ts`, `todo.md` |

Do not casually edit framework internals under `server/_core/` or `lib/_core/`. Before adding backend or database work, read the mobile backend guidance and inspect the current schema, router authorization, migrations, and tests. Database migrations are additive; never use destructive SQL or insert test data into the production database.

## Authentication and authorization rules

Admin authentication uses the existing Manus OAuth flow. The parent phone-plus-OTP screen is not an authentication provider. Keep the designated email authority checks server-side and test them through the existing clinic-authority test coverage. Frontend hiding is not authorization. Every protected tRPC procedure must enforce the correct role and clinic scope server-side, return factual authorization errors, and avoid leaking patient data through error messages or exports.

The super-admin email is `thisispratha@gmail.com`; the clinic administrator email is `anilrajojha@pahs.edu.np`. Treat these as governance configuration already represented in the project, not as secrets. Never place passwords, OAuth tokens, database URLs, API keys, or secret values in source control or documentation.

## Background jobs and communications

The project contains review-first and scheduled operational logic for referral monitoring, archive work, monthly archive summaries, quarterly retention review, waitlist follow-up, maintenance preferences, and reminder preparation. Do not turn a draft into an automatic outbound message merely because a scheduler exists. Any future background process must be idempotent, auditable, bounded, and safe during server restarts. Respect the project’s existing scheduler and persistent event patterns rather than creating an untracked process.

## Safe change workflow for future agents

First read `todo.md`, `design.md`, this handoff, the relevant Expo module `DOCS.md`, and the backend guide if the work touches server/database/auth. Add every requested change to `todo.md` as an unchecked item before implementation. Inspect existing screens, domain types, server procedures, and tests before modifying behavior. Implement the smallest additive change that preserves the authority model and free-of-cost boundary. Add deterministic tests for all business rules and role restrictions. Mark completed checklist items as checked immediately after the feature is complete.

Run `pnpm check`, `pnpm lint`, and `pnpm test`. Review `git diff --check`, inspect `.manus-logs/` for runtime problems, and avoid browser testing for native-only behavior. Save a checkpoint only after reading `todo.md` and confirming all completed work is marked `[x]`. Never deploy from the sandbox; use the managed Publish action after a checkpoint when the owner is ready. For GitHub operations, use the authenticated GitHub CLI, inspect branches first, merge deliberately, and push only after checks pass.

## Current completion status

The current project includes the single-clinician pediatric booking experience, Nepali-first bilingual presentation, persistent language toggle, durable appointment and record workflows, clinician dashboard, super-admin governance, maintenance and feedback tooling, redaction safeguards, waitlist and capacity workflows, audit retention/archive tooling, deployment runbook, parent OTP mockup, and clipboard confirmation feedback. The last saved project checkpoint is `aeef7725`.

The remaining owner decision is production finalization: review the live preview and native build, verify the two designated login roles, confirm the provisional address and clinic content, decide whether real guardian authentication is required, configure production secrets through the project UI, run the deployment checklist, and publish only after explicit review. Do not represent the app as medically diagnostic, as having sent a message when it only prepared one, or as having real parent OTP authentication while the mockup remains frontend-only.

## Addendum — Supabase + PWA backend wiring (2026-08-26)

The backend direction is **Supabase** for patient identity and data. This addendum
records what was added on top of the state described above.

- `supabase/migrations/0001_init.sql` — Postgres mirror of every Drizzle table
  (29 tables), enum types, `updated_at` triggers, and **RLS policies on all
  tables**: `clinic_public_settings` is publicly readable; the clinic-workflow
  tables require `is_trusted_admin()` (email `anilrajojha@pahs.edu.np` or
  `role = 'admin'`); `users` rows are self-scoped plus trusted-admin management.
- `supabase/seed.sql` — clinic public settings, governance defaults, and the
  **private** `patient-documents` Storage bucket (never public).
- `supabase/config.toml` — local `npx supabase start` config.
- `lib/supabase.ts` — anon-key client (EXPO_PUBLIC_SUPABASE_URL /
  EXPO_PUBLIC_SUPABASE_ANON_KEY); returns null gracefully when unconfigured so
  sample-data mode keeps working.
- `server/supabase.ts` — service-role client (SUPABASE_URL /
  SUPABASE_SERVICE_ROLE_KEY), server-side only.
- `app.config.ts` web block — full PWA manifest (standalone, theme `#0E7490`,
  background `#F7FAFC`, iOS `apple-mobile-web-app-*` meta tags); web export is
  `static` → `npx expo export --platform web` produces an installable PWA.
- `eas.json` — EAS profiles: `preview` (internal APK) and `production` (store AAB).
- `.env.example` — full environment reference (existing + Supabase variables).
- `docs/PRODUCTION_DEPLOYMENT_AND_LIVE_AUTH_VERIFICATION.md` — includes the
  Supabase setup, PWA, EAS, and troubleshooting sections (see sections 6-8).

**Live status (2026-08-26):** the Supabase project **appointment**
(ref `bpocsorqstqfessdclfh`, Tokyo) is created and fully wired: migrations
`0001` + `0002` applied, seed applied, `clinic_public_settings`,
`super_admin_governance_settings` rows live, private `patient-documents`
bucket created, Email auth enabled (confirmations on), the two trusted aunts
provisioned and mapped into `public.users` (openId = auth uid, role `admin`),
grants set (anon = public read only; authenticated/service_role = full with
RLS gating; helpers are SECURITY DEFINER to avoid RLS recursion). Local `.env`
(never committed) holds `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, and the two
trusted sign-in passwords. `node scripts/verify-supabase.mjs` passes 10/10
(public read, anon write denial, trusted-admin RLS visibility, non-admin RLS
block, storage privacy, service-role bypass).

**Still open:** the clinic-workflow tRPC routers (Drizzle-backed) are not yet
reading from Supabase; Supabase Auth sign-in for parents is scaffolded
(`lib/supabase.ts` helpers) but not yet surfaced in UI (per the handoff, real
guardian verification needs an explicit production decision); the web/PWA and
Android builds are not deployed yet — see the deployment runbook. The
Express/MySQL layer remains transitional.
