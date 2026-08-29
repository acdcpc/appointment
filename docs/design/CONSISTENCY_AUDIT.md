# Consistency Audit — parent-facing screens (flag-only)

Audited against `main` @ `4f73333`. Every finding cites the file(s) checked.
Severity: HIGH = brand/product-level inconsistency · MED = visible drift ·
LOW = polish. Per the task brief: **flagged, not built** (except where a
finding is documentation-only).

## F1 · HIGH — Brand color split (teal vs navy) — ✅ RESOLVED 2026-08-29 (canonical: navy `#092C4C`; docs, PWA theme-color, charts synced; teal = supporting clinical accent token)

- `design.md:57` and `docs/NEPALI_PARENT_USABILITY_GAP_REPORT.md:11` document
  **teal `#0E7490`** as brand primary; the task brief repeats it.
- Runtime token is **navy `#092C4C`** (light) / `#5BB8D0` (dark) —
  `theme.config.js`, changed deliberately in rebrand commit `675950e`
  ("Applied Rainbow Child Development Clinic branding … updated brand color").
- Teal survives hardcoded in: `components/who-growth-reference-chart.tsx`
  (observed curve + dots), `components/clinician-intelligence.tsx`
  (height chart color), `app.config.ts:99` + `app/+html.tsx:20` (PWA
  theme-color), and teal-tint literals (`#E0F2F3`, `#BCE7EA`, `#D7F2F3`).
- **Flag:** decide the brand primary once (navy as shipped, or restore teal),
  then align design.md, PWA theme-color, and the two chart components. The
  Figma tokens file records code-truth (navy) and keeps teal as a named
  chart accent so nothing is silently lost.

## F2 · MED — Radius fragmentation — ✅ RESOLVED for booking.tsx (now 12/14/16/18/20 + 36 circle)

- `design.md` (Visual System): cards 16–24, chips 12, buttons 14.
- Measured: `app/booking.tsx` uses **10 distinct radii** (10, 11, 12, 13, 14,
  15, 16, 18, 20, 36); `app/(tabs)/index.tsx` uses 10 (10–22);
  `app/(tabs)/appointments.tsx` has a **radius 5** outlier; about uses 13/18/32.
- **Flag:** normalize to the 5-token scale in figma-tokens.json
  (chip 12 · button 14 · card 18 · cardLg 20 · pill 36) at the next
  code-touch; no functional change.

## F3 · MED — Micro text below legibility floor — ✅ RESOLVED (8pt/9pt/10pt labels raised to 11–12pt)

- `app/about.tsx` (styles `closedMark`) **fontSize 8** "Closed" mark;
  `app/booking.tsx` (`available`) **fontSize 9** slot-availability label;
  `summaryLabel`/`weekday`/`whatsAppNotice` at **10pt**.
- Nepali lines are healthy (13–16pt @ 800 — booking `nepali` 16/800,
  `nepaliLabel` 13/800, index `primaryButtonNepali` 13/800; Devanagari
  renders well at these sizes). Keep Devanagari ≥ 12–13pt.
- **Flag:** lift micro text to an 11pt floor (12 for anything Devanagari or
  action-adjacent).

## F4 · MED — Accent + surface tints hardcoded — ✅ RESOLVED (semantic tokens in theme.config.js; parent screens migrated, dark-mode safe)

- Coral accent `#F97360` (design.md "Accent") exists only as literals —
  `app/(tabs)/index.tsx` primaryButton/bookingEmpty, `app/booking.tsx`.
- Success literal `#2F855A` in `app/booking.tsx` (`successMark`) duplicates
  the existing `colors.success` token.
- Surface tints `#EAF7F0`, `#FFF8EB`, `#FDE7E2`, `#FDECEC`, `#FFF4F1`,
  `#FFF5F2`, `#E0F2F3`, `#BCE7EA`, `#D7F2F3` are literals across index,
  booking, about, parent-auth — **they do not flip in dark mode** (theme has
  a full dark palette).
- **Flag:** promote these to extended tokens (already modeled in
  `color-extended`) and migrate literals.

## F5 · LOW/MED — Touch targets below 44px — ✅ RESOLVED (all raised to 44 incl. back links)

- `app/booking.tsx`: `previewToggle` minHeight 42 · `contactCheck` 42 ·
  `optionalToggle` 38 · `suggestButton` 40 · `topicChip` 36.
- `app/about.tsx` + `app/parent-auth.tsx`: `‹ Back` text-only links (no
  min-height, ~20pt effective target).
- Passing elsewhere: slot chips 44, filter chips 44, offer/calendar actions
  44, primary CTAs 54–58 (`slot`, `chip`, `offerAction`, `calendarButton`,
  `primaryButton`).
- **Flag:** lift the six spots above to 44 (padding, not visual size).

## F6 · DOC/CODE MISMATCH — Phone+OTP mockup gone from main — ✅ RESOLVED (docs retired; design.md/todo.md no longer claim the mockup; no SMS)

- `todo.md` ("Add discoverable parent phone-plus-OTP frontend mockup entry
  point from the home screen" `[x]`) and `design.md` (Parent phone-plus-OTP
  mockup section) describe a built mockup.
- Reality: commit `aeef772` embedded the OTP states in `app/parent-auth.tsx`;
  the Supabase email+password rewrite (`eed6b8a`) replaced that file and the
  mockup was not carried over. No dedicated OTP file was ever created
  (`git log --all --diff-filter=A` has none). Home has no OTP entry point.
- **Flag (decision needed, per brief this is flag-only):** either restore the
  review-only mockup section (it was frontend-only, no SMS — consistent with
  the no-paid-SMS rule), **or** update `todo.md`/`design.md` to retire the
  claim. Current state silently contradicts the docs.

## F7 · LOW — Trust-banner coverage gaps — ✅ RESOLVED (banner added to onboarding + parent-auth using booking's pattern)

- Banner (name + "Associate Professor Dr. Anil Ojha, MBBS, MD, FCCH")
  present: booking, home, find, about, clinician, weekly-capacity export.
- Missing where design.md's pattern logically applies:
  `app/onboarding.tsx` (the new clinic-introduction screen — best candidate
  for the credential line) and `app/parent-auth.tsx` (brand mark "R" exists;
  credentials line would complete trust parity).
- **Flag:** add the credential line to onboarding (and optionally
  parent-auth) — one-line, token-only change.

## F8 · PASS — Bilingual pattern consistency

- English primary + Nepali secondary implemented uniformly
  (`bilingualText(language, en, ne)` in every parent screen); Nepali is the
  first-use default with a persistent toggle (`lib/language-preference.tsx`).
  No screens invent a different bilingual layout. No change needed.

## Recommendations (outside scope — not built)

1. Resolve F1 with a one-line brand decision, then sync 4 files
   (design.md, app.config.ts, +html.tsx, 2 chart components).
2. Adopt the 5-radius + extended-color tokens (F2/F4) — mechanical sweep.
3. 11pt text floor + 44px target lift (F3/F5) — six small edits.
4. F6: choose restore-vs-retire for the OTP mockup; keep "no paid SMS" either way.
5. Re-export `figma-tokens.json` after the brand decision so Figma stays the
   single source of truth.
