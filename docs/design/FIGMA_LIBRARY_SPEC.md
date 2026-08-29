# Figma Library Spec — build guide from the imported tokens

How to use with `docs/design/figma-tokens.json` (no Figma connector in the
dev workspace — this is the Figma-ready path, same approach as the earlier
"design-token templates" checkpoint in todo.md):

1. In Figma, install the **Tokens Studio** plugin → Import → paste
   `figma-tokens.json` (or open as a token set). This creates the variables
   below; apply Light/Dark via the two themes in `$themes`.
2. Create color styles bound to the variables (so audit F1's eventual
   resolution only touches tokens).
3. Build the components on one "Library" page with the measured specs below.
   Every spec value below is **as implemented** — this documents the app, it
   does not redesign it.

## Page 1 — Foundations

- **Color variables**: `color-light` + `color-dark` sets (primary,
  background, surface, foreground, muted, border, success, warning, error),
  plus `color-extended` (coral accent + surface tints + legacy teal) — see
  audit F1/F4 before wiring these into styles.
- **Type styles**: from `typography` set. Heading weights are 900 (EN) /
  800 (NE); body weight 600; eyebrow 800 with +1.2–1.4 letter-spacing.
- **Radius tokens**: chip 12 · button 14 · card 18 · cardLg 20 · pill 36.
- **Spacing scale**: 4 / 8 / 12 / 16 / 20 / 24. Cards pad 13–17 in practice
  → snap to 14/16 when rebuilding (note in description, do not change code).
- **Sizing**: touchMin 44 · slotChip 44 · buttonLg 58 · avatar 44/48.

## Page 2 — Components (all as implemented)

| Component | Variants / properties | Measured spec (source) |
|---|---|---|
| **Doctor trust banner** | default | Border 1, radius 18, padding 12, row, gap 10; 38×38 badge (radius 14, bg primary, white 900 initial); name 13/900; credentials 11/16 muted (`app/booking.tsx` doctorBanner/doctorBadge) |
| **Service card** | grid / compact | Grid: border 1, radius 18, padding 13, minWidth 145, maxWidth 48%, icon 22/900, title 14/900, NE label 13/800, meta 12/17. Compact: full-width single column (`serviceCard`/`compactServiceCard`, booking.tsx) |
| **Date strip cell** | available / selected / disabled | flex 1, radius 15, paddingY 11, day 11/900, number 16/900, availability 9/900 (audit F3) (`date`, booking.tsx) |
| **Slot chip** | default / selected / disabled | minWidth 94, minHeight 44, radius 12, px 11, grouped rows gap 8 with 12/900 uppercase group titles (`slot`, `slotGroup`, booking.tsx) |
| **Step indicator** | 1 Visit / 2 Time / 3 Confirm | Text row 12/900, active = primary color; inactive = muted (`steps`, booking.tsx) |
| **Success screen** | — | 72×72 circle (radius 36, bg #2F855A), 36/900 ✓, summary card radius 20 pad 17, label 10/900 +1 tracking, share/WhatsApp/copy row, toast radius 12 py 10 (`successScreen`, `summary`, `copyToast`, booking.tsx) |
| **Toast** | success / error / info | radius 12, px 14 py 10, white 13/900 text on state color (`copyToast`, booking.tsx) |
| **Primary button** | single-line / bilingual | radius 14–17, minHeight 54–58, white 15–17/900 + NE second line 13/800 @ 85% (`primaryButton`, booking.tsx + index.tsx) |
| **Secondary/outline button** | — | minHeight 48, radius 14, border 1, primary text 14/900 (`secondaryButton`, booking.tsx) |
| **Chip / filter** | on / off | minHeight 44, px 12 py 9, radius 12–20, border 1 (`chip`, find.tsx) |
| **Card (base)** | — | border 1, radius 18, padding 14–16, surface bg, border color token (`childCard`, index.tsx; `card`, about.tsx) |
| **Banner cards** | notice / confirm / warning / offer | radius 16–17, padding 14, tinted bg: warning #FFF8EB, success #EAF7F0, danger #FDE7E2, coral #FFF4F1 (untokenized — audit F4) |
| **Text input** | — | minHeight 43–48, radius 11–15, px 10–14, 13–15pt text, placeholder muted (`input`, `serviceSearch`, booking.tsx) |
| **Back link** | — | `‹ Back` 15/800 primary, no min height (audit F5) (parent-auth.tsx, about.tsx) |
| **Bilingual text pair** | EN primary + NE secondary | EN at style size, NE at −1..−3pt, weight 800, muted or tinted color (`primaryButtonText`/`primaryButtonNepali`, index.tsx) |
| **Contact tile** | Call / WhatsApp / Directions | minWidth 140, minHeight 58, radius 14, label 11/800 uppercase + value 14/800 (`contactButton`, index.tsx) |
| **Calendar cell (about)** | open / closed | 14.285% width, minHeight 42 (non-interactive), closed bg #FDE7E2 + "Closed" 8/900 (audit F3) (`calendarCell`, about.tsx) |

## Screen frames to assemble (1:1 with code)

Onboarding → Parent sign-in → Home → Booking (3 steps + success) →
Find → Appointments → Records → About → Report acknowledgement.
Clinician + Super-admin are separate protected flows; include as separate
Figma pages if needed (same tokens, denser cards).
