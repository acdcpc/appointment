# Known gaps and open decisions

Single ledger for items that are deliberately **not** built yet, so nothing lives
only in a chat thread. Updated 2026-09-15 (HEAD `aa87f2d` + this pass).

## Owner action required

| Item | State | What is needed |
|---|---|---|
| **Hosted publish (Netlify)** | Superseded: the Netlify account is credit-locked (403 on builds and CLI uploads). **Production is Cloudflare Pages** — `https://rainbowclinic.pages.dev`, deployed with `wrangler pages deploy dist`. | Nothing. The Netlify workflow files stay in the repo as a fallback only. |
| **Device app-kill verification** | The booking draft now persists on native through AsyncStorage (write-through + restore at module load), and the sync API is covered by `tests/booking-draft.test.ts`. | A device/app-store build test: start a booking, background the app, kill it from the app switcher, reopen, confirm the selections return. Not provable in the web harness. |
| **QA test accounts** | Removed 2026-09-15 — `qa-check-…`, `rsltest-…`, `patient-…` deleted from Auth. Removed again 2026-09-28 — the three verification accounts (`rls-…`, `diag2-…`, `diag-link-…`) deleted. Four accounts remain: the two clinic-owned logins, the super-admin, and the owner's own `thisisisiis@gmail.com` sign-up. | Nothing. |
| **QA growth measurements** | Removed 2026-09-28 — two implausible measurement rows on the seeded demo child (23 cm head circumference at 52 months) were added through the clinic-admin account during growth verification. Archived to `docs/archive/removed-qa-measurements-2026-09-28.json`. | Nothing; re-add real values through the Growth tab. |

## Decisions taken deliberately (do not silently reverse)

| Item | Decision | Rationale |
|---|---|---|
| **Scheduled visit reminders** ("your visit is tomorrow") | **Not built.** | Needs a push channel plus explicit guardian consent; the previous instruction was explicitly "no new automated reminders". Surfacing the existing next-visit state on Home is done instead. |
| **Clinic summary expectation** | **Documented, not automated.** The past-visit closure line tells the parent the clinic shares a summary when ready. | If a visit is never summarised, that is a clinic process gap rather than an app gap — the app must not promise a summary it cannot produce. |
| **Phone + OTP sign-in** | Documented future direction only; no UI, no SMS provider (F6, 2026-09-15). | Restoring a mockup that authenticates nothing would mislead parents. |
| **Clinician dashboard on static hosting** | Requires the tRPC server; parent flows work standalone. | Server deployment is a separate hosting task; the dashboard is deliberately not pretended to work without it. |

## Verification baseline at this commit (updated 2026-09-28, `e0fb7dd`)

`pnpm check` 0 errors · `pnpm lint` clean · `pnpm test` **95 passed across 21 files**
(1 environment-skipped) · `expo export --platform web` succeeds · deployed to
`https://rainbowclinic.pages.dev` (`e004afdb`).

Supabase suites: `scripts/verify-guardian-rls.mjs` 12/12, `scripts/verify-supabase.mjs`
14/14, `scripts/smoke-clinical-layer.ts` 14/14, `scripts/verify-growth-trend.ts` **9/9**
(two visits for one patient written, read back and compared with the real trend
builder, then removed).

## Growth module (added 2026-09-20 → 2026-09-28)

| Piece | State |
|---|---|
| WHO tables (`lib/who-data/*`) | Weight-for-age, length/height-for-age, head circumference-for-age and BMI-for-age; LMS rows plus SD rows exactly as published. |
| Interpretation (`lib/growth-interpretation.ts`) | Exact LMS z-scores, percentiles (A&S 7.1.26), WHO z-bands and the WHO classification per metric (underweight, stunting, micro/macrocephaly, wasting, overweight, obesity). Refuses to score outside each metric's published age range (weight > 10 y, head circumference > 5 y, BMI < 24 mo). |
| Chart (`components/growth-chart.tsx`) | The child's measured points against the ±2 SD, ±3 SD and median curves, bands labelled with the equivalent centiles, the latest point annotated with its own z-score and centile. |
| Visit-to-visit comparison (`lib/growth-trend.ts`) | Change, rate (g/day under 120 days, else kg/month; cm/month, cm/year for length), Δz and centile movement between the two most recent visits. A fall of more than 0.67 z — one WHO centile band — is flagged as growth faltering with the follow-up question attached. |
| Screen (`app/(tabs)/growth.tsx`) | Metric tabs, chart, per-metric interpretation, the change-since-previous-visit card, WHO reference values at the child's age, per-measurement history with its own delta line. English throughout; the tab is for the clinic. |
| Tests | 8 WHO-maths tests + 8 trend tests (16 in the two growth suites); the trend suite includes the regression that a weight change is never reported in centimetres. |

Known nuance, deliberately not "fixed": the SD tables and the LMS tables come from
different WHO series in the source project (e.g. girls' height-for-age at 24 months:
SD median 85.7 cm, LMS M 86.4008 cm, ≈ 0.2 z apart). z-scores and percentiles use the
LMS series; the chart bands use the SD series, both as published.

## Fixed 2026-09-17 — reported by the owner from a real Chrome session

| Report | Root cause | Fix |
|---|---|---|
| "Book visit → nothing happens" | The Book visit tab (`app/(tabs)/find.tsx`) was a leftover mockup: its clinician card was a `Pressable` with **no `onPress`** and it never routed to the real booking wizard. | Tab rewritten: live service list, working search/topic filters, working empty state, and a CTA that opens `/booking` with the chosen visit type. |
| Booking offered stale days | `dates` was hardcoded to `["Tue, Aug 20", "Wed, Aug 21", "Thu, Aug 22"]` — a month in the past — in both the booking screen and the Visits tab. | New `lib/clinic-days.ts` derives real upcoming days from today, honouring closed weekdays and holidays; covered by `tests/clinic-days.test.ts`. |
| A booked visit disappeared | `bookAppointment` only wrote React state; nothing persisted. | Appointments now write through to storage, so a visit survives a reload and appears in the Visits tab. |
| "Created a new account does not say anything" | The success banner lived only inside the form, and the signed-in card replaced the form the instant a session existed — so the confirmation was destroyed before it could be read. | The confirmation is rendered on the signed-in card too, and stays on screen ~1.8s before the app opens. |
| "Forgot password link does not work" | Supabase `site_url` was `https://app.rainbowchildclinic.com` (does not resolve) with an **empty** redirect allow-list, so every emailed link died. | Site URL set to `https://rainbowclinic.pages.dev`, allow-list set, `mailer_autoconfirm` enabled. Verified with a real recovery link. |
| Visits tab showed a stray `jha.` | A truncated string concatenation in the subtitle. | Removed. |

Still true after these fixes: bookings are confirmed by the clinic by phone/WhatsApp, and the clinician dashboard still needs the tRPC server deployed before appointments reach the clinic electronically.

## Fixed 2026-09-28 — reported from a real iPhone session

| Report | Root cause | Fix |
|---|---|---|
| Onboarding: "the bottom part is completely obscured and could not be scrolled" | The exported shell injects `body{overflow:hidden}` (`ScrollViewStyleReset`), so a page can only scroll through its own `ScrollView` — and onboarding had none. Its CTA sat under Safari's toolbar, and `height:100%` resolves against the *large* viewport on iOS. | Onboarding (and report-acknowledgement) now render inside a `ScrollView` with a growing centred column and `bottomClearance` (≥ 48 dp). The shell uses `100dvh` where supported and pads `#root` by `env(safe-area-inset-*)`, so Safari's toolbar and the home indicator never cover reachable content. |
| "Most of the font is not readable in night mode" (growth page, dark) | The palette's CSS variables were emitted **twice**: on `<html>` at runtime for the selected scheme, and as light values baked into the app wrapper's inline style by the static export. The wrapper copy sits closer to every element, so it shadowed the dark values — the canvas stayed parchment while inline-styled text switched to near-white (~1.1:1). | On web the palette is owned solely by `<html>` (the wrapper `vars()` is native-only) with light defaults in `global.css` for the pre-hydration paint. The growth chart's hard-coded slate greys (down to ~2.4:1 in dark) now use the accessible `muted` token. |
| "Still default name Aarav coming up" | The prototype seeded three sample children, sample history and sample growth rows in state, and an empty/absent server answer kept them ("no linked children" was treated as failure). A localStorage copy (`rainbow-child-profiles`) survived reloads. | Sample patients removed everywhere: children/history/growth rows start empty and fill only from Supabase (an empty answer is respected); the localStorage copy is purged on every load; growth, booking, home and records show honest empty states instead of a name. |

Seed-data removal, same day, at the owner's request: the three prototype children
(`child-1` — renamed to "pkasa" at some point — plus `child-2` Maya Gurung and
`child-3` Rohan Thapa) were deleted from Supabase, archived first in
`docs/archive/removed-seed-children-2026-09-28.json`. `clinic_children`,
`guardians` and `child_growth_measurements` are now empty: the app and the database
show no patient at all until the clinic creates a real record.
`scripts/verify-growth-trend.ts` now creates and removes its own temporary patient,
so the end-to-end check still runs after the seeds are gone (10/10 checks).

Still open from this: there is no in-app form yet for the clinic to create a new
patient record in `clinic_children` — booking requests bring the details in, but
the record that the growth chart and guardian linking hang off needs either this
form or a deliberate import step before real use.

## Fixed 2026-09-29 — owner reports from the live site

| Report | Root cause | Fix |
|---|---|---|
| Dark mode: "most of the font is not readable" (staff Clinic home; Mac in light mode with the app set to dark) | The web variant of `hooks/use-color-scheme.web.ts` returned react-native's SYSTEM scheme, not the app's chosen scheme. CSS-variable surfaces (canvas) followed the app's choice while every inline colour (headings, eyebrows, buttons) followed the OS — dark-on-dark. | The web hook now reads the theme context — the app's choice, with the system value only as its initial default — keeping the light hydration gate so the first client render still matches the prerendered HTML. |
| Booking showed only the next four days; "let visitors choose the date from the calendar" | The day picker was a fixed row of four chips. | New `components/booking-calendar.tsx` — a dependency-free month grid (open / closed / today / selected states, month navigation, 240-day horizon aligned with `upcomingClinicDays`). `lib/clinic-days.ts` gains `parseClinicDay` + tests. |
| Date of birth had to be typed freehand; support Nepali B.S.; allow "age only" when the date is unknown | One free-text field, A.D. only — awkward on phones and impossible for parents who know the B.S. date. | New `components/dob-picker.tsx`: three scrollable picker rows (year / month / day), English (A.D.) ⇄ Nepali (B.S.) switch, "date of birth not known — I will enter the age instead" checkbox, and a live preview showing both calendars and the computed age. New `lib/nepali-date.ts` wraps the conversion table (BS 2000–2090) and is pinned by tests against the seven known Nepali New Year anchors; impossible days are rejected by roundtrip rather than silently rolling over. |

Date of birth saved on the request (2026-09-29, owner request): migration
**0016** adds `child_dob` ("14 May 2022") and `child_dob_bs` ("31 Baisakh 2079")
to `booking_requests` — both nullable, because a parent who does not know the
date enters the age only. The A.D. text is canonical (the app's age maths reads
it); the B.S. text is kept because parents and staff read that form directly.
The clinic panel shows "DOB: 14 May 2022 · 31 Baisakh 2079" on every request
that has one, and the booking confirmation shows it back to the parent. The
profile edit path was also carrying — and had been WIPING — the date; it now
preserves both fields. Applied via `supabase db push` (the tracking table made
0016 the only pending migration); verified end-to-end by
`scripts/verify-booking-dob.ts` (5/5: store, read-back both texts, null when
absent, cleanup).

Browser-based UI verification introduced (2026-09-29, evening): `scripts/ui-verify.mjs`
and `scripts/ui-layout-audit.mjs` drive headless Chrome against the deployed site
(signs in as the clinic admin from .env, never confirms a booking, never signs
out). 19/19 checks pass: staff-home dark contrast measured in-page (heading
15.4:1 on #171310), onboarding CTA reachable by scrolling, the booking calendar,
and the A.D./B.S. picker (auto age fill, both-calendar preview).

The layout audit immediately caught a real bug introduced with the picker: the
date-of-birth field carried `flex: 1` (flex-basis 0%), which mis-computed the
field's height as if the three scrollable chip rows contributed nothing — the
rows overflowed and drew over the Age / Weight fields below. Fixed by giving the
field its natural height (`dobField`, no flex) and pinning the row scrollers to
`flexGrow: 0 / flexShrink: 0`; geometry re-verified 3/3 (rows stack in order,
Age sits 39 px below the day row). Screenshots under docs/screenshots/
(2026-09-29-*).

Minor, known, cosmetic: the floating language pill can momentarily sit over
bottom-right content at some scroll positions (moves with scroll; not a blocker).

Verification round (2026-09-29, late): the build-context badge showed "Staging"
on the production site because EXPO_PUBLIC_APP_ENV was never set — the config
fallback is now "live" (this repo deploys the live clinic site; other contexts
must set the variable explicitly) and .env sets it too. New
`scripts/ui-overlap-sweep.mjs` walks seven pages in a real browser (staff home/
clinician/growth in dark + light desktop; onboarding/booking/find at phone
width) and flags any two text elements whose clipped-visible rectangles
intersect: 7/7 clean. The only reported hits are the known floating "ने · English"
pill gliding over content while scrolling (expected for a fixed pill).

Build-context badge — corrected and verified (2026-09-29): the earlier entry
was premature. The first re-export after changing app.config.ts still embedded
the OLD manifest ("staging") because expo kept a cached bundle of the previous
config; `expo export --clear` (after removing .expo/dist) embeds the resolved
value. Verified in a real browser: the badge on rainbowclinic.pages.dev now
reads "Live environment"; the live bundle carries `appEnvironment:"live"`.
Lesson: after any app.config.ts / .env change, export with --clear or the
embedded manifest silently stays stale.

Book visit tab removed from navigation (2026-09-29, owner request): once a
visit is confirmed, a second "Book visit" destination in the nav read as a
duplicate of the Home tab's booking button. The tab is gone from the mobile tab
bar and the desktop top nav for parents (Home / Visits / Growth / Profile now);
booking stays one tap away on Home, and the /find route still resolves for
links. Staff navigation untouched. Verified in a real browser:
scripts/check-nav.mjs — 6/6 (no Book visit entry, Home button opens the booking
flow, staff nav intact, /find resolves).

Profile tab simplified (2026-09-29, owner request): the "Practice team" section
(heading + clinician-dashboard card) is gone — staff still reach the dashboard
through their own Admin tab. The "Danger zone" label is gone too; the delete
card keeps its two-step confirm and exactly one message: "Removes your account
and child profile from the app." (the Nepali translation kept for the Nepali
UI). "Practice information" was left untouched (not part of the request).
Verified in a real browser: scripts/check-profile.mjs — 7/7.

Staff sign-in map (2026-09-29, verified in a browser — scripts/check-staff-signin.mjs, 5/5):

- **Clinic admin** (`anilrajojha@pahs.edu.np`) and **super-admin**
  (`thisispratha@gmail.com`): sign in with their email+password anywhere — the
  parent sign-in form routes these two emails straight to `/clinician`. On any
  device where their session exists, the app shows the staff shell (Clinic home
  + Admin + Settings tabs, floating authority badge), so it is one tap to the
  dashboard afterwards. Fresh devices open `/clinician` — the shared staff
  entry ("Clinic team sign in").
- **Clinical team (invited members)**: same sign-in page with their own email;
  once activated by the clinic, they see only their assigned workspace.
  **Honest limit today:** the live static build has no clinic API server
  connected, so entry falls back to the client authority list — only the two
  authority emails are admitted; any other email gets "Clinic access required".
  To admit real team members: connect the API server (full staff management),
  or temporarily add their emails to the allow-list (one line each in
  server/clinic-authority.ts).
