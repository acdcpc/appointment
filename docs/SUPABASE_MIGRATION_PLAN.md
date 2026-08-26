# Supabase Migration Plan — Rainbow Child Development Clinic

Audited 2026-08-26 against `main` @ `39662b5`. This document is the audit
output + migration roadmap. Read it before touching backend code.

## 1. Audit summary

### 1.1 tRPC routers (`server/routers.ts`, ~70 procedures)
- One `appRouter`: `system`, `auth`, `administration` (super-admin), `clinicPublic`,
  `reportAcknowledgement`, `guardianRecordAccess`, `clinician` (clinic admin) +
  one LLM draft procedure (`draftFromConsultation`).
- Authorization: `protectedProcedure` (cookie session user),
  `clinicAdminProcedure` / `superAdminProcedure` (server-side email checks in
  `server/clinic-authority.ts`), maintenance-mode gate in `trpc.ts`.
- **Every data procedure delegates to `server/db.ts`** — no direct SQL anywhere
  else in routers. This makes the data layer the single migration seam.

### 1.2 Drizzle schema (`drizzle/schema.ts`, 29 tables, MySQL dialect)
- camelCase columns, string enum columns, `clinic*UserId` scoping on every row.
- Relationships: `users.id` ↔ `clinic_staff_accounts.staffUserId` /
  `clinicianUserId` references; `childId` is an **opaque string** (no children
  table, no guardian table, no FKs on it).
- Postgres mirror already applied to Supabase (`0001` + `0002`), verified 10/10.

### 1.3 Authentication flow (current)
- Manus platform OAuth (`OAUTH_SERVER_URL`) → code exchange →
  `SDKServer.authenticateRequest` → JWT cookie (`COOKIE_NAME`, `jose`,
  `JWT_SECRET`) → `ctx.user` (a `users` row keyed by `openId`).
- `app/parent-auth.tsx` is a **frontend-only phone+OTP mockup** (no network,
  no provider). It must not reach production as an auth path.
- Guardian record access today: clinician-issued reference + 6-digit code
  (hashed in `guardian_record_access_challenges`) → short-lived access token.

### 1.4 Database relationships & integrity patterns that must be preserved
- **Race-safety:** `reserveReferralEmailRetry` uses a DB transaction;
  slot booking must stay single-writer (unique constraint + conditional write).
- **Atomic conditional updates:** guardian challenge attempt increment /
  revocation; report acknowledgement (once-only); audit archive marking
  (once-only); staff invitation status transitions.
- **Upserts:** `onDuplicateKeyUpdate` in MySQL → `ON CONFLICT` upsert in
  Postgres (supabase-js `upsert` + uniqueness preserved by migration indexes).
- **Audit trail:** referral audit events, retention policy changes,
  staff activity, archive runs, super-admin audit events — all append-only
  written via the same functions.

## 2. What CANNOT be directly migrated (transitions, not migrations)

| Concern | Why | Path |
|---|---|---|
| Platform OAuth session issuance (cookie + exchange endpoints) | Supabase Auth replaces identity; the Manus OAuth endpoints/cookie format are platform runtime | Replace: Supabase Auth email/password + phone OTP (guardians). Keep email authority checks unchanged (email-based, works with Supabase JWT email). |
| `createHeartbeatJob` / `updateHeartbeatJob` schedulers | Manus runtime API (`/api/scheduled/*` + heartbeat) | Replace with Supabase pg_cron (DB-level, supported) or Edge Function cron triggers in Phase B. |
| `invokeLLM` (`draftFromConsultation`) | Platform LLM gateway | Keep transitional until an external provider (Edge Function + own API key) is approved. |
| `server/_core/storageProxy.ts`, `server/storage.ts` | Platform blob storage | Phase B: Supabase Storage (`patient-documents` bucket already exists). |
| Platform SDK/voice/image endpoints | Runtime capabilities | Out of scope for clinic workflows; remain transitional. |
| MySQL dialect details in tests (`tests/`) | Suite runs without a DB (fallback path) | Keep fallback in legacy layer so tests stay hermetic. |

## 3. Target architecture

```
Expo app ── tRPC (unchanged client contracts)
   │
   └─ server routers (unchanged authorization model)
        │
        └─ server/db/ facade  ◄── NEW dispatch point
             ├─ db/supabase.ts   (primary; service-role client + RPC)
             └─ db/legacy.ts     (fallback only when Supabase unconfigured;
                                  preserves local dev + deterministic tests)

Supabase side:
  ├─ migrations 0001–0006 (schema + RLS + guardian identity + RPC functions,
  │   maintenance/feedback tables, pgcrypto, extension search_path)
  ├─ Supabase Auth (email for staff; phone OTP for guardians — requires
  │   Twilio provider credentials, supplied by the clinic owner)
  └─ Edge Functions (Phase B: scheduled ops, notification orchestration)
```

Guardian RLS model (Phase A): new `guardians` table links
`auth.users.id ↔ childId(+phone)`. Policies let `auth.uid()` read only rows
whose `childId` is in their guardian link set (`clinic_appointments`,
`waitlist_requests`, `patient_report_shares`, records). Clinician/super-admin
visibility unchanged (trusted-admin helpers).

## 4. Phases

### Phase A — delivered 2026-08-26
1. `docs/SUPABASE_MIGRATION_PLAN.md` (this file).
2. Migrations `0003–0006` applied to live project `appointment`
   (`bpocsorqstqfessdclfh`):
   - `0003` `guardians` table + RLS (guardian-scoped reads on
     `clinic_appointments`, `waitlist_requests`, `patient_report_shares`,
     `referral_audit_events` via `guardian_child_ids()`) + 7 SECURITY DEFINER
     RPCs (appointment upsert, referral retry reservation, guardian challenge
     issue/verify, report acknowledgement, overdue-delivery claim, audit
     archive, retention summary) + grants.
   - `0004` maintenance/feedback parity tables (5 tables + governance
     maintenance columns) with RLS + grants (Drizzle parity 0026–0033).
   - `0005` pgcrypto extension; `0006` RPC `search_path = public, extensions`
     (Supabase installs pgcrypto into `extensions`).
3. `server/db/` facade live: `index.ts` dispatches on env
   (`SUPABASE_URL`+`SUPABASE_SERVICE_ROLE_KEY` ⇒ supabase, else legacy).
   `supabase.ts` implements all 120 runtime exports (service-role client +
   RPCs); `legacy.ts` is the moved `server/db.ts`, unchanged, kept as the
   hermetic-test fallback.
4. Real guardian phone OTP shipped: `app/parent-auth.tsx` now calls
   `supabase.auth.signInWithOtp({ phone })` + `verifyOtp` through
   `lib/supabase-auth.ts`. No mock success state — an unconfigured project or
   missing SMS provider surfaces a clear error. Home button relabeled.
5. Verified: `pnpm check` clean, `pnpm lint` clean, 41 Vitest tests green,
   `scripts/verify-supabase.mjs` 10/10, live smoke test passed (guardian
   challenge issue→verify→validate round trip, wrong-code rejection, retry
   reservation, archive preview, RLS backend detection).

### Phase B — next sessions
- Schedulers → pg_cron/Edge Function cron (referral monitor, retention
  archive, monthly/quarterly summaries) using `supabase/functions/scheduled-ops`
  (draft included in Phase A).
- Staff sign-in → Supabase Auth email/password; deprecate OAuth endpoints.
- Storage → Supabase Storage signed URLs in report-sharing flows.
- Retire `server/db/legacy.ts` + Drizzle once local/tests can target a
  Supabase test project (search for `SUPABASE_SERVICE_ROLE_KEY` in CI).

## 5. What the clinic owner must still supply (blocks the last mile)

- **Twilio (or any) SMS credentials + enabling the phone provider** in the
  Supabase dashboard (Authentication → Providers → Phone). Until then the
  guardian OTP screen works end-to-end in code but cannot deliver SMS. This is
  the explicit approval for a paid service already given by the owner; only
  the credentials are missing.
- **Supabase Management API access token** for further provider/config edits
  via the API (dashboard edits work without it).
- Phase B follow-ups: staff email sign-in migration onto Supabase Auth
  (replacing Manus OAuth), `pg_cron`/Edge Function scheduled ops, storage
  signed URLs, retiring the legacy Drizzle layer once CI targets a Supabase
  test project.

## 6. Security requirements preserved
- RLS enabled on all tables; trusted-admin helpers `SECURITY DEFINER`
  (recursion-safe). Guardian policies add a **third gate**: data visible only
  through the explicit guardian↔child link row.
- No client-side authority decisions; routers keep server checks.
- No auto-sent messages; retry/ack/archive stay clinician-confirmed + once-only.
- Keys: service role stays server-only (verified: anon write denied 401;
  anon governance denied 401; non-admin RLS returns 0 rows).
- Phone OTP requires an SMS provider: the client surfaces provider errors
  verbatim instead of fabricating a signed-in state.
  (Twilio) — until then the flow fails closed with a clear error, not a mock.