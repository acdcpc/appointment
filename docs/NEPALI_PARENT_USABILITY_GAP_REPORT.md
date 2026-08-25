# Nepali Parent-Usability Gap Report

## Scope and audit method

This report audits the supplied Nepali parent-usability brief against the current Rainbow Child Development Clinic repository before applying further design changes. The audit prioritizes parent-facing screens and intentionally excludes redesign of clinician-only scheduling, conflict detection, growth-chart, referral, staff, audit, and retention architecture unless a parent-facing exposure is identified.

The repository was inspected through its README, app routes, parent booking implementation, navigation shell, shared language preference, clinic-care model, and relevant parent-facing components. The referenced `design.md` and `branding-notes.md` files were not present in the audited repository, so the supplied brief and implemented code are the available sources of truth. Existing rainbow-and-child assets remain unchanged. The current workspace does not expose a Figma connector; this report is therefore the implementation-ready, Figma-ready source of truth rather than a claim that a Figma file exists.

## Verified design system and boundaries

The implementation already uses the requested clinical-trust direction: primary teal `#0E7490`, warm coral `#F97360` for confirmation actions, light clinical surfaces, ink/slate text, success/warning/error states, rounded cards, rounded chips, and bottom-tab navigation. Server-side authority checks keep super-admin and clinic-administrator scopes separate. This audit does not alter those boundaries.

| Area | Current evidence | Status | Scoped decision |
|---|---|---|---|
| Clinic and clinician trust | Booking presents Rainbow Child Development Clinic and Associate Professor Dr. Anil Ojha with MBBS, MD, FCCH and Developmental Pediatrician credentials. | Built | Keep the current initials badge unless a verified clinician photo is supplied; do not call it a photo. |
| Bilingual service labels | Booking service cards have English and Nepali labels, and a persistent English/Nepali navigation preference exists. | Partially built | Make Nepali the first-use default while preserving saved user choice and canonical English service values. |
| Search and topic filters | Booking has local search, topic chips, available-day selection, grouped time slots, compact preview, review, and success states. | Built | Preserve this low-decision pattern. |
| Available-only scheduling | Booking separates dates and available slots; durable clinic-care helpers enforce hours, breaks, holidays, and conflicts. | Partially built | Do not redesign scheduling logic; ensure future parent date presentation is driven by authorized availability rather than hard-coded presentation dates. |
| Parent phone + OTP | The repository uses platform OAuth/session flow; no parent-specific phone-plus-OTP path was found. | Architecture gap | Document and defer a separate parent-auth design with provider, abuse, recovery, and consent decisions. Preserve admin OAuth. |
| Confirmation sharing | The current confirmation explains that no WhatsApp/calendar message is sent automatically, but has no audited parent WhatsApp/share control. | Gap | Add a user-initiated minimal appointment-summary share action only; do not send automatically or include clinical notes. |
| Plain-language states | Core booking has bilingual empty/success copy, but parent-facing state copy elsewhere is mixed English and operational wording. | Partial gap | Normalize only audited parent loading, empty, retry, and error states; never surface technical exceptions. |
| Navigation language | A local persistent toggle is mounted in the app shell. | Built, needs default adjustment | Change the new-device fallback to Nepali only. |
| Branding provenance | Existing icon assets are present; the supplied brief requires the existing rainbow-and-child mark. | Asset-source gap | Do not generate a new logo. Recreate or supply branding notes if exact provenance is needed. |
| Clinician architecture | Clinician dashboard, operations, reports, and governance components are present. | Out of scope | Do not redesign them without a parent-facing exposure. |

## Implementation priorities

The highest-value confirmed gaps are presentation-level. First, Nepali should be the default presentation language for a new parent device while retaining the persistent toggle. Second, booking confirmation needs a user-initiated WhatsApp/share affordance using a minimal summary. Third, parent loading, empty, retry, and error messages should be normalized to simple bilingual wording on implemented parent screens. The phone-plus-OTP request remains documented rather than implemented because it changes identity architecture and requires a separate threat model.

## Scoped design changelog

| Gap | Scoped change | Not changed |
|---|---|---|
| Nepali is not the initial fallback | Set the local presentation provider’s default to Nepali and preserve saved English/Nepali choice. | Canonical service names, database values, authority checks, and clinician architecture. |
| No confirmation share affordance | Add a user-initiated share action with only clinic, clinician, service, date, and time. | Automatic WhatsApp/email/SMS, clinical text, or delivery claims. |
| Inconsistent parent state copy | Add a small bilingual state-copy map where a concrete parent-facing gap is confirmed. | Clinician operational copy and server internals. |
| Referenced design files absent | Retain this report as the Figma-ready source and document the missing files. | Inventing a new brand or visual direction. |

## Validation requirements

Run TypeScript, lint, deterministic tests, and reusable-workflow validation. Separately verify that parent changes do not expose patient data, do not add automatic communications, do not alter super-admin/clinic-admin authority, and do not redesign clinician-only modules.
