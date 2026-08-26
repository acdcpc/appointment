# End-to-End Verification Report — 2026-08-26

Scope: freezes Phase B; verifies the shipped app (guardian email+password auth, RLS,
clinical workflows, web build) against the live Supabase backend. No architecture
changes were made except one additive DB migration fixing a latent RPC defect
found by this verification (see Blocker below).

## Gates

| Check | Result |
|---|---|
| `pnpm check` (tsc) | 0 errors |
| `pnpm lint` | 0 errors (1 pre-existing warning) |
| `pnpm test` | 41 passed · 1 skipped (env-gated) |
| `node scripts/verify-supabase.mjs` | 12/12 |
| `node scripts/verify-guardian-rls.mjs` | 12/12 |
| `node scripts/smoke-clinical-layer.ts` | 14/14 |
| `pnpm exec expo export --platform web` | exported `dist` |

## 1. Guardian auth (email + password)

Live-verified against Supabase Auth (project `bpocsorqstqfessdclfh`):

- account creation via Admin API with `email_confirm: true` (production path:
  inbox confirmation via `signUpGuardianWithEmail`, `mailer_autoconfirm=false`);
- real password grant sign-in (`/auth/v1/token?grant_type=password`) → JWT with
  `role: authenticated` and correct `sub`/`email` claims;
- logout → access token invalidated (204) and **refresh token rejected (400)**
  after sign-out — no session leak;
- guardian↔child link (`guardians` table) + RLS read scoping verified.

App-level flows (`app/parent-auth.tsx` sign-in ⇄ sign-up, confirmation-pending
state, session hooks) exercise these same Supabase calls and are covered by the
vitest suite; no mock auth exists in the client.

## 2. RLS / data-access audit (12/12)

`scripts/verify-guardian-rls.mjs` proves, against live data:

- guardian **reads own child's rows only** (appointments; 5b confirms zero rows
  for another child's `childId`, 6 confirms governance settings invisible);
- guardian **INSERT denied (403)**;
- guardian **UPDATE cannot modify rows** — the appointed row's `reason` is byte-
  identical after the tamper attempt;
- guardian query of another child's data returns 0 rows, never an error.

Two initial failures were test-harness false alarms, not RLS holes:

1. `like=` filter without URL-encoding `%` → PostgREST 500 (script bug; filter removed).
2. PATCH returned **204**, then **200 with an empty body `[]`** under
   `Prefer: return=representation`. PostgREST reports a zero-row no-op UPDATE
   (row hidden by RLS) that way — it does **not** return 403/404. The service-
   role read after the attempt proved the row was never modified. The check now
   asserts the empty body + unchanged value.

Policy dump confirmed every clinic table's `rls_*_{insert,update,delete}` policies
are `is_trusted_admin()`-gated and reads are admin OR `guardian_child_ids()`-scoped
(migration 0003). No policy changes were required.

## 3. Clinical workflow smoke (14/14)

`scripts/smoke-clinical-layer.ts` exercises the real `server/db` dispatcher
(Supabase backend) for: clinic public settings; appointment upsert via the
`clinic_upsert_appointment` RPC + list; durable waitlist state
(request/event/capacity snapshot) save+get; staff invitation create → list →
revoke; referral audit persist/list; referral email retry reservation counting
(limit respected, attempts increment); capacity-target-change alert
record/list/ack; service suggestion submit/list; guardian contact create/list;
report share creation **blocked for unconfirmed guardian**, then once-only
acknowledge after confirm; staff invitation settings save/get. All test rows
cleaned up post-run.

## 4. Blocker found & fixed (additive migration 0007)

`saveClinicAppointments` failed live with `42P01: missing FROM-clause entry for
table "public"`. Root cause: `clinic_upsert_appointment` (migration 0003) used

```sql
returning row_to_json(public.clinic_appointments)
```

A schema-qualified table name is not a valid row expression in RETURNING.
Latent since 0003; first exercised now because live smoke previously covered the
challenge RPCs but not this upsert. Fixed via
`supabase/migrations/0007_fix_appointment_upsert_returning.sql`
(`row_to_json(clinic_appointments)`), applied with `supabase db push`, then
re-verified: appointment upsert now returns the row JSON. Sweep confirmed no
other migration uses the pattern.

## 5. Web compatibility

`react-native-url-polyfill` (missing dep) was added for Supabase on the web/RN
targets and imported in `lib/supabase.ts`. `expo export --platform web`
succeeds end-to-end (`dist/`), including the parent-auth and report-ack routes.

## Not re-verified / deferred

- Admin app (Manus OAuth) and staff flows on Supabase Auth → Phase B item 1.
- pg_cron/Edge scheduled ops → Phase B item 2.
- Storage signed URLs → Phase B item 3.
- Legacy Drizzle layer untouched (kept intact as unconfigured fallback) →
  Phase B item 4. See `docs/PHASE_B_BACKLOG.md`.

Tooling preserved in repo for repeat runs:
`scripts/verify-supabase.mjs`, `scripts/verify-guardian-rls.mjs`,
`scripts/smoke-clinical-layer.ts`.
