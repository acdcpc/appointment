# UI/design comparison — the alisha playbook vs this app

Date: 2026-09-28 · App commit: `e0fb7dd` (+ this pass) · alisha: skill proposal v2
(`~/.openclaw-autoclaw/skill-workshop/proposals/alisha-20260928-9795394ffc`)

The alisha skill is a production playbook for Expo + Supabase apps, written from
the traps of its reference build. This is a rule-by-rule check of its UI/design
requirements (§2 theme/localization/typography, §8 health content, §13 gesture-safe
layout, plus the release gate) against what this app actually ships.

| alisha rule | Verdict | Evidence in this app | Action |
|---|---|---|---|
| Palette **factory**, one source of truth per scheme | **Complies** | `lib/_core/theme.ts` builds a runtime palette per scheme (`buildRuntimePalette`, `Colors[scheme]`); `lib/theme-provider.tsx` holds the context and writes CSS variables + NativeWind | — |
| Dark mode switchable without a rebuild and persists | **Complies** | Profile has light/dark/system chips (`app/(tabs)/profile.tsx:164` via `useThemeContext`); selection persisted as `rainbow-color-scheme` and re-applied on load | — |
| Theme context every screen styles through | **Complies** | `useColors()` reads the context; every screen styles through it (colour tokens never inside `StyleSheet.create`, applied at usage sites) | — |
| **Text-size setting** applied app-wide | **Complies** | `lib/text-size.tsx`: small/normal/large, persisted; web scales the surface, native follows the OS preference; `useLargeTextLayout().minimumActionHeight` also grows the tab bar | — |
| Language: no hardcoded strings, one translations file, check numerals | **Partial** | Language context exists (`lib/language-preference.tsx`, English/Nepali, persisted, switchable without rebuild) but strings are inline `t("en","ne")` pairs — 234 lines carry Devanagari — rather than one `i18n/translations.ts`. Devanagari digits: **0 occurrences** (the numeral trap is absent) | Optional refactor: extract the pairs into one file when the string count next grows; no user-facing risk today |
| Gesture-safe bottom layout: 48 dp floor, sheets with `maxHeight`, ≥48 dp scroll padding | **Was partial → fixed in this pass** | No bottom sheets exist at all (modals are centred dialogs), so the sheet bug class cannot occur. But stack screens outside the tab bar (`/booking`, `/clinician`, `/super-admin`, `/deployment-feedback`) ended with only 20 dp of padding, and the tab bar trusted `insets.bottom` with an 8 dp floor — `useSafeAreaInsets().bottom` can report 0 on Android | Added `bottomClearance` to `ScreenContainer` (≥48 dp, ignores an inset of 0) and applied it to those four screens; raised the tab-bar floor to 24 dp. Arithmetic in `components/screen-container.tsx` |
| Health content: official datasets, automated validation, calm non-diagnostic wording, clinician sign-off | **Complies** | Growth uses the official WHO LMS/SD tables (`lib/who-data/*`) validated by 16 automated tests against published cut-offs; wording states value + neutral comparison ("supports, and does not replace, clinical judgement"); the ledger records that clinician sign-off of the band labels is still wanted before real use | Clinician to read the band labels once (ledger item) |
| Release gate: dependency and config health | **Was failing → fixed** | `expo-doctor` flagged a missing peer dependency (`expo-asset`, required by `expo-audio`) — a real crash risk outside Expo Go — and two pinned react-navigation versions | Installed `expo-asset`; declared the deliberate pins in `expo.install.exclude` with the reason (duplicate react-navigation caused the Cloudflare blank page). Gate now **18/18** |

## Deliberate deviations (do not "fix" these)

- **Inline bilingual pairs instead of one i18n file** — acceptable while the string
  count is small; the switch itself is centralised in `language-preference`.
- **Pinned `@react-navigation/native@7.1.25` / `bottom-tabs@7.8.12`** — newer than the
  SDK-recommended range, required so the static web export does not ship two copies
  of react-navigation (that was the blank-page cause). Excluded from version
  validation on purpose.
- **Nepali default language** — the audience is Nepali-first; the alisha playbook
  assumes an English default.

## Bottom line

The app already met the alisha playbook on the theme, dark-mode, text-size and
health-content rules. The comparison surfaced two genuine defects — the missing
`expo-asset` peer dependency (device crash risk) and missing gesture-strip clearance
on the four screens outside the tab bar — both fixed and shipped in this pass.
