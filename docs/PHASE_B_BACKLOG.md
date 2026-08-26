# Phase B Backlog — Supabase migration follow-ups

Owner decision 2026-08-26: email + password guardian auth is the current
**production** authentication path. The four items below are **Phase B** —
none of them block the core application. Do not start them while the core
app is being finalized, and do not let them expand this migration's scope.

Companion doc: `docs/SUPABASE_MIGRATION_PLAN.md` (phase A delivery record).

## Guardrails

- **Legacy Drizzle layer stays intact.** `server/db/legacy.ts` is the original
  `server/db.ts`, moved verbatim. It is the deterministic fallback when
  Supabase is unconfigured (local dev, the 41-test suite). Do not remove,
  rewrite, or trim it until Item 4 below is green **and** CI targets a
  Supabase test project. The only swap point is `server/db/index.ts`
  (`dbBackend` export).
- **No SMS / phone OTP.** Phone OTP is a deferred extension seam only — see
  "Deferred (not scheduled)" below. No Twilio, no paid SMS provider.
- Each item has its own acceptance criteria; treat an item as done only when
  the app + `node scripts/verify-supabase.mjs` (12/12) + `pnpm test` are green.

---

## Item 1 — Staff sign-in onto Supabase Auth (replace Manus OAuth)

**Why:** the clinician dashboard still authenticates through the Manus
platform OAuth (cookie + `jose` JWT). Supabase is the primary backend; staff
should sign in with email + password like guardians do.

**Current state:**
- Supabase email provider enabled, signups on, confirmations required.
- Trusted users exist: clinic admin `anilrajojha@pahs.edu.np`,
  super-admin `thisispratha@gmail.com` (both in `public.users`, `role=admin`),
  created via the admin API with `email_confirm: true`.
- Server-side email authority checks (`server/clinic-authority.ts`) are
  email-based and work unchanged with Supabase JWT emails.
- OAuth endpoints + cookie flow remain transitional and functional.

**Tasks:**
1. Server: an auth adapter in tRPC (`server/_core/trpc.ts` / `context.ts`)
   that accepts a Supabase session (JWT from `supabase.auth` / `getSession`)
   OR continues to accept the existing OAuth cookie — both resolve to a
   `users` row (by `openId`; for Supabase users `openId = auth uid`).
2. App: staff sign-in screen (email + password) calling
   `supabase.auth.signInWithPassword`; session persistence; sign-out.
3. Re-provision any remaining staff accounts through the admin API with
   `email_confirm: true` and map them into `public.users` (`openId = auth uid`).
4. Keep `clinic-authority` email checks untouched (authority source of truth).

**Acceptance:** clinician logs in with email+password; super-admin and clinic
admin see the same governance/clinic data as today; OAuth fallback removable
without touching routers.

---

## Item 2 — Scheduled ops to pg_cron / Edge Functions

**Why:** `createHeartbeatJob` / `updateHeartbeatJob` use the Manus runtime
scheduler API; the data work already runs against Supabase.

**Current state:** all atomic primitives already exist as Postgres RPCs
(migration 0003): `claim_overdue_referral_deliveries`,
`archive_expired_audit_events`, `reserve_referral_email_retry`,
`clinic_upsert_appointment`. Schedulers in `server/referral-delivery-monitor.ts`,
`server/audit-retention-archive.ts`, `server/monthly-archive-summary.ts`,
`server/quarterly-retention-review.ts` call them through the dispatcher.

**Tasks:**
1. Port the four schedules to pg_cron (e.g. Supabase dashboard → Database →
   Extensions or an Edge Function invoked by cron) with the same
   once-only/skip semantics (`disabled-or-orphan`, `already-sent`).
2. Keep the functions idempotent (they already are: claim/archive are
   conditional updates; summary/review skip when already sent).
3. Wire dashboard visibility of `lastRunAt` / `lastArchiveRunAt` as today.

**Acceptance:** each schedule fires without the Manus runtime; runs recorded
in the same tables (`audit_archive_runs`, monitor `lastRunAt`); no duplicate
alerts or archive passes.

---

## Item 3 — Storage signed URLs for report sharing

**Why:** `server/_core/storageProxy.ts` / `server/storage.ts` use platform
blob storage. Supabase Storage bucket `patient-documents` already exists and
is private (verify script checks anon denial).

**Tasks:**
1. Upload documents via service role to `patient-documents`.
2. Generate short-lived signed URLs for the clinician report-sharing flow
   (an hour-by-hour expiry, matching the existing token expiry model).
3. Keep audit events for every download (reuse `persistReferralAuditEvent`
   or the new storage-audit pattern).

**Acceptance:** clinician previews/downloads a report with a signed URL;
bucket stays private to anon (12/12 check unchanged); download is audited.

---

## Item 4 — Retire the legacy Drizzle layer

**Why:** `server/db/legacy.ts` + Drizzle/MySQL stay only as the unconfigured
fallback. Removing them simplifies the stack — but ONLY after CI can run the
suite against Supabase.

**Preconditions (do not skip):**
- CI (or the repo's test script) has `SUPABASE_URL` + a test-project
  `SUPABASE_SERVICE_ROLE_KEY`; `scripts/verify-supabase.mjs` runs in CI.
- Unit tests are rewritten so the deterministic 41 tests either mock the RPC
  layer or run against the Supabase test project.

**Tasks:**
1. Flip `server/db/index.ts` to fail loudly when Supabase is unconfigured
   (remove silent legacy fallback).
2. Delete `server/db/legacy.ts`, Drizzle deps, and the in-memory sample-data
   paths (db.ts fallback behaviors).
3. Update docs/AGENT_CONTEXT/tests accordingly.

**Acceptance:** `pnpm check && pnpm lint && pnpm test` and
`verify-supabase.mjs` pass with no `DATABASE_URL`/legacy code present.

---

## Deferred (not scheduled, does not block anything)

- **Phone OTP extension:** add `requestGuardianPhoneOtp` /
  `verifyGuardianPhoneOtp` in `lib/supabase-auth.ts` (one-line
  `signInWithOtp` calls) and enable the phone provider in the Supabase
  dashboard. No code surface changes elsewhere; `guardians` RLS (0003) is
  provider-agnostic. Only pursue if the clinic later approves a paid SMS
  provider.
- Platform-exclusive capabilities (`invokeLLM`, voice/image endpoints) stay
  transitional and are not part of this migration's scope.

## Status log

- 2026-08-26 — Backlog created (owner decision: email+password production
  auth; Phase B non-blocking; legacy layer kept intact).
