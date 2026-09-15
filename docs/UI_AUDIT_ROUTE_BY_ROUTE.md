# Route-by-route UI audit — Rainbow Child Development Clinic

Step 1 deliverable of the 2026-09-15 UI/UX redesign prompt. Findings are
recorded from the running app (Expo web dev server + exported static build) and
the source, before/while the redesign changes were applied. Two previously open
findings (F1, F6) are resolved here explicitly, with the chosen option recorded.

## Decisions carried into this work

| Finding | Decision | Rationale | Files touched |
|---|---|---|---|
| **F1 — brand colour split** | **Navy `#092C4C` is the single canonical primary.** Teal `#0E7490` is retained as the *secondary* healthcare token (links, selected/availability states, chart series); coral `#F97360` is the booking action. | Navy is the more recent deliberate rebrand and matches the prompt's "deep navy" brand direction. Nothing is removed — teal stops being treated as primary. | `theme.config.js`, `app.config.ts` (PWA theme-color `#092C4C`), `app/+html.tsx`, `components/who-growth-reference-chart.tsx` (series → teal token), `design.md` |
| **F6 — phone+OTP discrepancy** | **Documentation-only option chosen (no mockup restoration).** `design.md` now states explicitly that no phone/OTP UI exists, that parent sign-in is email + password, and that phone OTP is a *documented future direction* behind the `lib/supabase-auth.ts` seam. `todo.md` claims are marked superseded rather than silently wrong. | Restoring a "this did nothing" mockup into a production sign-in screen adds confusion and no user value; the honest documentation route is smaller, safer and matches the product decision already taken on 2026-08-26. | `design.md`, `todo.md` |

## Route findings

| Route (`file`) | Problems observed | Action taken |
|---|---|---|
| **Entry gate** (`app/index.tsx`) | Splash showed an emoji mark (🌈) rather than the clinic asset; no brand wordmark. | Real clinic icon asset; wordmark added on Home + nav (below). |
| **Onboarding** (`app/onboarding.tsx`) | Emoji mark; hero-only composition with no clinic motif; privacy line buried at the bottom. | Icon asset, growth/milestone motif under the hero, doctor credentials banner retained, privacy note kept directly under the CTAs. |
| **Parent sign-in** (`app/parent-auth.tsx`) | Emoji/letter mark; no confirm-password; no forgot-password path; raw provider errors surfaced to parents; the previous sandbox-OAuth clinician button bounced. | Rainbow icon, confirmed-password field (sign-up), "Forgot password?" → email reset flow, friendly bilingual config-error copy, real Supabase email+password for parents. |
| **Home** (`app/(tabs)/index.tsx`) | Every section was an equally-weighted card stack; hero lacked clinic identity; no motif; the "next appointment vs first-use" decision was not dominant. | Doctor wordmark under the page title, motif inside the first-use empty state, one dominant Book CTA kept above the shortcut rows, contact tiles compacted into one equal row. |
| **Booking** (`app/booking.tsx`) | Long single scroll; primary action could scroll out of view on mobile; coral CTA carried white text (AA risk on the coral fill). | Pill CTA with ink-on-coral text, stepper retained (1 Visit · 2 Time · 3 Confirm), review + success blocks unchanged in order, privacy reminder retained. |
| **Appointments** (`app/(tabs)/appointments.tsx`) | Empty state was a bare card; status colour alone carried meaning in places. | Status keeps icon + text + colour; empty state gains the motif and a single next action. |
| **Family profile** (`app/(tabs)/profile.tsx`) | Hardcoded demo identity (Jordan Smith / jordan@example.com); dead rows with no handlers; no appearance controls. | Real guardian identity from the Supabase session; working child editor; Night mode + text-size controls; danger-zone account deletion. |
| **About / clinic info** (`app/about.tsx`) | Credentials and hours present, but the page read as a generic info dump. | Doctor credential block styled with the same wordmark treatment; hours/closures/contact retained. |
| **Guardian records** (`app/(tabs)/records.tsx`) | Child scope was implicit; badge colours mixed (cool tints from the old palette). | Child-scoped header retained; status tokens re-mapped; "sign in to see records" state instead of demo data. |
| **Clinician dashboard** (`app/clinician.tsx`) | Clinician sign-in was unusable outside the sandbox (env-driven OAuth redirect bounced). | Supabase email+password sign-in with server-side token verification and clinic-admin authority check; operations density intentionally different from parent cards. |
| **Super-admin** (`app/super-admin.tsx`) | Governance controls were readable but deletions weren't visible anywhere. | Added "Deleted guardian accounts" section (super-admin only) fed by the retention table. |

## Cross-cutting findings

1. **Nepali text height** — Devanagari needs more line-height than Latin at the same size; several Nepali secondary lines sat at a Latin-style 1.3 ratio. Raised on the parent routes; web now loads Mukta + Noto Sans Devanagari.
2. **AA contrast on warm fills** — coral/green fills previously carried white text (≈3:1). Fill/text pairs are now ink-on-coral (`colors.onAction`) and white-on-navy (`colors.textInverse`), both ≥4.5:1.
3. **Demo identity leakage** — Home, Profile and Records could show fictional children. All parent routes now distinguish *server-linked child* / *account not yet linked* / *signed out*.
4. **Contrast in dark mode** — light-only tint literals (e.g. `#E0F2F3`) were hardcoded in several screens; all parent screens now read tint tokens so dark mode does not leak light surfaces.

## Validation performed

`pnpm check` (0 errors) · `pnpm lint` · `pnpm test` (41 passed, 1 env-skipped) ·
`pnpm exec expo export --platform web` · Supabase verification suite 14/14
(including guardian-scoped child-record RLS round trip).

## Remaining live-release tasks (owner-controlled)

1. Publish the Netlify deploy (Deploys tab) — the hosted URL still has no published build.
2. Real-device checks: iOS/Android text scale at 1.3× and 2.0×, Nepali long-string wrapping at 360×640 and 390×844.
3. Live role checks with clinic-owned accounts (super-admin, clinician, guardian test link).
4. Provide the HTTPS API/auth host for the hosted environment (the clinician dashboard needs the tRPC server; parent flows work static).
