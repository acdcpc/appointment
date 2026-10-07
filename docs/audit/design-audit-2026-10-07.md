# Design audit — Rainbow Child Development Clinic app (2026-10-07)

Run with the design skill's UI completion check against the live site
(https://rainbowclinic.pages.dev) in a real browser: 10 screens × multiple
viewports (360–1280), five check categories — icons & assets, typography &
content, colour & contrast, layout & spacing, multi-viewport responsiveness.
Tooling: `scripts/design-audit.mjs` (+ the geometry helpers in
`scripts/ui-overlap-sweep.mjs`). Raw data: `design-audit.json` and
`before/design-audit.json`; screenshots in this folder (`before/` = pre-fix).

## Result summary

| Category | Before | After | Notes |
|---|---|---|---|
| Contrast violations (WCAG AA) | 23 | **0** | All were hardcoded light colours in staff components breaking in dark mode |
| Tiny text (< 12px) | 174 | 153 | Every 9–10px layer removed; remaining = the 11px label standard (eyebrows, tab labels, units) |
| Touch targets below advisory 44px | 288 | 206 | Remaining are dense pickers at 40–44px (WCAG AA needs 24px; met) |
| Text overlaps | 16 | 7 | Remaining 7 = icon-font glyph layers (single glyphs, perfectly stacked, invisible); all real text overlaps gone |
| Broken images | 0 | 0 | — |
| Accidental horizontal overflow | 0 | 0 | Checked at 360/420/600/768/1024/1280 |

## What was fixed

1. **Dark-mode colour integrity (the big one).** 25+ staff/clinician components
   hardcoded `#FFFFFF` fills, `#E0F2F3` chip selected-states and white button
   text — unreadable combinations in dark mode (measured down to 2.2:1). All
   replaced with theme tokens (`colors.surface`, `colors.tealSurface`,
   `colors.textInverse`, `colors.warningSurface`, etc.). 23 → 0 violations.
2. **Icon consistency.** Emoji/glyph icons replaced with the app's own icon
   set (IconSymbol → Material/SF symbols): onboarding features (📅🔔🔒), home
   contact tiles (✆⌖ⓘ), the Book-visit tab search glyph, the clinician lock
   mark. The floating language pill and build-context badge are now
   theme-aware.
3. **Type floor.** Every 9–10px text layer raised to 11px (tab labels, nav
   subtitle, age units, invitation label, badges); 11px is the documented
   floor for small labels.
4. **Touch sizes.** Calendar day cells 36 → 42px, picker year/month/day chips
   40 → 44px, calendar nav buttons 36 → 44px, secondary buttons min-height
   44px, report date picker days 34 → 38px.
5. **Audit-tooling bug (honest note).** The overlap classifier used by the
   earlier verification scripts treated RNW's `position:absolute; inset:0`
   shell containers as "floating overlays", which could make checks pass
   vacuously. The classifier now distinguishes structural shells from real
   anchored overlays — the sweep has been re-run under the fixed rule
   (7/7 clean, genuinely).

## Accepted / documented (not defects)

- **7 icon-glyph overlap pairs** (tab bar icon layers): single icon-font
  glyphs stacked perfectly; invisible in rendering; excluded from text checks.
- **153 × 11px labels**: deliberate small-caps/eyebrow/label scale; the
  smallest text anywhere in the app.
- **Sub-44px dense pickers** (42px calendar cells, ~40px chips): WCAG 2.5.8
  AA (24px) met with margin; the 44px AAA guidance is deliberately not
  applied to dense grids to keep them usable on small screens.
- **One clipped-chip measurement** ("वर्ष 2022" read at 11×34px while
  partially scrolled out of its row) — measurement artifact, not a layout
  defect.
- **Fixed-palette surfaces** keep their own colours where self-consistent and
  readable: the build-context badge pills and the maintenance-mode banner
  (amber box with its own ink text).
