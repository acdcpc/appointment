# Known gaps and open decisions

Single ledger for items that are deliberately **not** built yet, so nothing lives
only in a chat thread. Updated 2026-09-15 (HEAD `aa87f2d` + this pass).

## Owner action required

| Item | State | What is needed |
|---|---|---|
| **Hosted publish (Netlify)** | Build is proven (cold `pnpm install` → cache bootstrap → `expo export` → `dist/index.html`); `netlify.toml` sets the build command, `dist` publish dir and the SPA fallback. The site URL still answers `Not Found`, i.e. no published deploy. | One owner action in the Netlify dashboard: Deploys → link `acdcpc/appointment` (branch `main`) → Trigger deploy. |
| **Device app-kill verification** | The booking draft now persists on native through AsyncStorage (write-through + restore at module load), and the sync API is covered by `tests/booking-draft.test.ts`. | A device/app-store build test: start a booking, background the app, kill it from the app switcher, reopen, confirm the selections return. Not provable in the web harness. |
| **QA test accounts** | Removed 2026-09-15 — `qa-check-…`, `rsltest-…`, `patient-…` deleted from Auth; only the two clinic-owned accounts remain. | Nothing. |

## Decisions taken deliberately (do not silently reverse)

| Item | Decision | Rationale |
|---|---|---|
| **Scheduled visit reminders** ("your visit is tomorrow") | **Not built.** | Needs a push channel plus explicit guardian consent; the previous instruction was explicitly "no new automated reminders". Surfacing the existing next-visit state on Home is done instead. |
| **Clinic summary expectation** | **Documented, not automated.** The past-visit closure line tells the parent the clinic shares a summary when ready. | If a visit is never summarised, that is a clinic process gap rather than an app gap — the app must not promise a summary it cannot produce. |
| **Phone + OTP sign-in** | Documented future direction only; no UI, no SMS provider (F6, 2026-09-15). | Restoring a mockup that authenticates nothing would mislead parents. |
| **Clinician dashboard on static hosting** | Requires the tRPC server; parent flows work standalone. | Server deployment is a separate hosting task; the dashboard is deliberately not pretended to work without it. |

## Verification baseline at this commit

`pnpm check` 0 errors · `pnpm lint` clean · `pnpm test` 68 passed (1 environment-skipped)
· `git diff --check` clean · `expo export --platform web` succeeds · Supabase
verification suite 14/14 (guardian-scoped child records, guardian linking RPCs,
account-deletion retention).
