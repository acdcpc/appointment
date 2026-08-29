# Factual UI Inventory — Rainbow Child Development Clinic (as implemented)

Scope: parent-facing surfaces, verified against `main` @ `4f73333` (2026-08-28).
This is an inventory, not a redesign plan. Anything `[x]` in `todo.md` is
treated as DONE and is documented, not re-proposed.

## Screens (route → file)

| Route | File | Status notes |
|---|---|---|
| Entry gate | `app/index.tsx` | Session check → app (signed-in) or onboarding (signed-out). Brand splash while checking. |
| Onboarding | `app/onboarding.tsx` | Welcome, 3 bilingual feature cards (book / updates / privacy), Get started → parent-auth, Explore-first → tabs. |
| Parent auth | `app/parent-auth.tsx` | Real Supabase email+password (sign-in ⇄ sign-up, email-confirmation state, bilingual errors). **OTP mockup NOT present** (see audit F6). |
| Home (tabs) | `app/(tabs)/index.tsx` | Child card, next-appointment hero, modified-hours notice, confirm/reschedule ack, prep card, earlier-slot offer/request, Book a visit, Parent sign in, call/WhatsApp/directions contacts. |
| Booking | `app/booking.tsx` | 3-step flow (1 Visit / 2 Time / 3 Confirm): doctor trust banner, service grid + search + compact mode, date strip, grouped slot chips, review card, success screen with WhatsApp share + copy-to-clipboard + privacy note. |
| Find | `app/(tabs)/find.tsx` | Service search + filter chips + service cards. |
| Appointments | `app/(tabs)/appointments.tsx` | Upcoming/past list, appointment cards. |
| Records | `app/(tabs)/records.tsx` | Child records, export PDF, privacy notice (parent view hides audit detail per design.md). |
| Profile | `app/(tabs)/profile.tsx` | Guardian identity/settings. |
| About | `app/about.tsx` | Doctor credentials card, clinic hours, closure calendar, visit & contact actions. |
| Report ack | `app/report-acknowledgement.tsx` | Guardian report acknowledgement (once-only via token). |
| Clinician | `app/clinician.tsx` + `components/clinician-*` | Protected workspace (OAuth + server-side authority check): calendar day/week, conflicts, WHO charts, referral builder, audit log, retention. |
| Super admin | `app/super-admin.tsx` | Governance + service-suggestion review. |

## Bilingual system

- `lib/language-preference.tsx` — context + hook; **Nepali is the first-use
  default** (`useState<AppLanguage>("ne")`), persistent toggle, English/Nepali
  pairs everywhere via `bilingualText(language, english, nepali)`.
- Pattern: English primary line, Nepali secondary line, matching weights
  (typically 900/800 EN, 800 NE, NE at −1 to −3pt of the EN size).

## Visual system (canonical sources)

- Tokens: `theme.config.js` → `lib/_core/theme.ts` (`Colors`, `Fonts`,
  `SchemeColors`) → `hooks/use-colors.ts`; NativeWind vars in
  `lib/theme-provider.tsx` (`--color-*`), light **and** dark sets.
- Canonical palette (light / dark): primary `#092C4C` / `#5BB8D0`,
  background `#F7FAFC` / `#102A43`, surface `#FFFFFF` / `#173B56`,
  foreground `#102A43` / `#F7FAFC`, muted `#627D98` / `#B8C7D8`,
  border `#D9E2EC` / `#345A73`, success `#2F855A` / `#68D391`,
  warning `#C27C0E` / `#F6C453`, error `#C53030` / `#FC8181`.
- **Brand-color note:** `design.md` documents teal `#0E7490`; the runtime
  token is navy `#092C4C` (rebrand commit `675950e`). Teal remains hardcoded
  in charts (`components/who-growth-reference-chart.tsx`,
  `components/clinician-intelligence.tsx`) and the PWA theme color
  (`app.config.ts`, `app/+html.tsx`). Flagged in audit F1; the Figma tokens
  file documents code as truth with teal as a named legacy/chart accent.
- Typography: system sans (`Fonts.sans = system-ui`), weight-900 headings in
  booking/home, 17pt body baseline per design.md (observed body 14–15pt).
- Shape: cards 16–22, chips 10–12, buttons 13–17 observed (design.md says
  16–24 cards / 12 chips / 14 buttons — fragmentation flagged in audit F2).

## Documented patterns present in code

- Doctor trust banner (name + credentials) — `app/booking.tsx`,
  `app/(tabs)/index.tsx`, `app/(tabs)/find.tsx`, `app/about.tsx`,
  `app/clinician.tsx`, `components/weekly-capacity-summary-export.tsx`.
- Service card grid with compact mode — `app/booking.tsx`
  (`serviceCard` / `compactServiceCard`).
- Date strip + grouped time-slot chips (`slot` minHeight 44, groups) —
  `app/booking.tsx`.
- Step indicator (1 Visit / 2 Time / 3 Confirm) — `app/booking.tsx`.
- Success screen with WhatsApp-share + copy-to-clipboard + bilingual toasts —
  `app/booking.tsx` (`copyToast`, share actions).
- WhatsApp deep links, tel:, mailto:, map links — home + about.
- OTP mockup — **claimed done in `todo.md`/`design.md` but absent from main**
  (audit F6).
