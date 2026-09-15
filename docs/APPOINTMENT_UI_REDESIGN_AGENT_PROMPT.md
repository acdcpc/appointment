# Rainbow Child Development Clinic — UI/UX Redesign Prompt for the Project Agent

## Role and objective

You are the lead product designer and design engineer for **Rainbow Child Development Clinic**, a single-clinician pediatric and child-development practice led by **Associate Professor Dr. Anil Ojha, MBBS, MD, FCCH, Developmental Pediatrician**. Review and improve the existing `acdcpc/appointment` Expo mobile/web application. Do not create a new project, replace the architecture, or add unrelated marketplace features.

The objective is to make the application feel like a calm, trustworthy, family-centered pediatric clinic product with the clarity and conversion quality of leading appointment platforms, while remaining specific to one doctor and one clinic. Use established patterns from high-adoption products as inspiration, not as a visual copy. Do not claim that this application is the world’s most downloaded doctor-appointment app; no global ranking has been independently verified.

The product must remain **Nepali-first for parents and public visitors**, bilingual in Nepali and English, usable on mobile and web, free of paid communication services unless explicitly approved, and protective of sensitive child and guardian information.

## Current repository and visual findings

The repository already includes a semantic theme system, responsive web navigation, a Nepali-first parent experience, persistent family profiles, booking and appointment management, authenticated guardian records, clinician operations, super-admin governance, account profiles, dark mode, accessibility feedback, and production-readiness documentation. The current design source uses a calm clinical palette, rounded cards, deep navy/teal surfaces, coral action accents, system typography, and one-handed mobile interactions.

The current preview is clean and functional but visually too uniform. The home, booking, About, and onboarding routes share nearly the same composition: a top clinic header, left navigation, navy hero panel, coral `R` badge, and repeated white rounded cards. The result feels more like a generic clinic/admin portal than a distinctive pediatric-care product. The current design needs stronger route identity, a more ownable clinic mark and wordmark, clearer typographic hierarchy for Nepali, and a warmer family/pediatric visual language.

Preserve the current strengths: Nepali-first content, calm navy/white foundation, simple navigation, clear onboarding tone, responsive layout, visible role boundaries, and restrained visual density. Do not introduce decorative complexity that makes booking harder.

## Brand direction

Use this design direction throughout the public and parent-facing experience:

> **Nepali-first pediatric care: calm, trustworthy, family-warm, and clinic-professional — never a generic SaaS dashboard.**

Retain the existing trust palette as the foundation:

| Token | Direction |
|---|---|
| Deep navy | Primary trust surface and strong hero background. Keep contrast high and avoid overusing it on every card. |
| Teal | Primary healthcare action, links, selected states, and availability indicators. |
| Coral | Warm pediatric accent for the main booking action, success moments, and selected milestone highlights. |
| Soft ivory/cool gray | Page canvas that reduces glare and separates white surfaces. |
| Ink navy/slate | High-legibility text hierarchy. |
| Green/amber/red | Reserved for factual status states, never as decoration. |

Add one signature visual motif: **growth-chart curves and developmental milestone markers**. Use it sparingly in hero backgrounds, booking progress, child-profile completion, appointment preparation, and empty states. It should communicate development and continuity of care without implying a diagnosis, percentile, or clinical interpretation.

The clinic identity should not rely only on a single-letter `R` badge. Keep the supplied logo if it is the official asset, but create a stronger wordmark treatment around **Rainbow Child Development Clinic** and the doctor’s name. The mark must remain legible at launcher, header, splash, and small-screen sizes.

## Information architecture and route identity

Keep the existing parent routes, but give each a distinct purpose and visual rhythm. Do not make every screen another hero-plus-card stack.

| Route/area | Primary job | Required visual identity |
|---|---|---|
| Home | Help a parent understand the next useful action immediately. | Warm welcome, next appointment or clear first-use setup, one dominant booking action, concise clinic status, and a small milestone/growth motif. |
| Onboarding | Explain the minimum setup needed before booking. | A short three-step progress treatment with visible completion state, Nepali-first privacy explanation, and no unnecessary account claims. |
| Booking | Convert intent into an available appointment. | A focused stepper: child → service → date/time → review. Show only available slots, keep filters simple, and maintain a sticky or lower-screen primary action on mobile. |
| Find Care / clinician profile | Establish trust in the single doctor. | A clear doctor credential block, specialty explanation, clinic location, and direct booking CTA. Do not present a marketplace or fake provider comparison. |
| Appointments | Let a parent see and act on upcoming visits. | Upcoming appointment first, clear status badge, preparation checklist, reschedule/cancel actions, and calm empty state. |
| Family profile | Maintain children and caregiver details. | Child cards with active-child state, plain-language forms, save feedback, and no fixed demo identity. |
| About / clinic information | Answer practical questions. | Clinic identity, address, phone, email, hours, bilingual closure notices, map/directions action, and factual doctor profile. |
| Guardian records | Show only authenticated, linked, clinician-published information. | Trust-forward access explanation, clear enrollment state, child scope, published-history/growth state, and export preparation evidence without claiming delivery or reading. |
| Clinician dashboard | Support Dr. Ojha’s daily operations. | Dense but structured operational workspace with schedule-first hierarchy, not the parent visual style. |
| Super-admin | Support governance and infrastructure oversight. | Clearly separate governance controls from clinical workflow. Never expose database credentials, secrets, or raw infrastructure in the UI. |

## Parent booking experience

Reduce booking to the shortest safe path. The first viewport should answer: **Who is this clinic? What can I book? What do I need to do next?**

Use a single dominant CTA such as **भेट्ने समय बुक गर्नुहोस् / Book an appointment**. If the family profile is missing, explain the reason for setup in one sentence and take the user directly to child-profile creation. Avoid dead ends, hidden controls, and repeated navigation.

Use the following booking sequence:

1. Select or add the child.
2. Select a visit topic or service using concise bilingual labels.
3. Show the next available dates and grouped time slots generated from clinician-configured hours, breaks, holidays, and overrides.
4. Show a short review screen with child, service, date, time, clinic, and a privacy reminder.
5. Confirm with a clear success state, appointment summary, copy/share action, and route to appointment management.

Do not add insurance marketplaces, payments, automatic SMS, WhatsApp automation, AI diagnosis, or unapproved video consultation. A single pediatric clinician requires low decision load, not a large provider directory.

## High-adoption patterns to adapt carefully

Use these patterns because they are repeatedly present in established products, while adapting them to this clinic’s smaller scope:

| Pattern | Safe adaptation for Rainbow Clinic |
|---|---|
| Search/filter to booking | Replace marketplace search with visit-topic chips and one clinician profile. Keep the search optional and bounded. |
| Real-time availability | Continue using server/clinic schedule rules as the source of truth. Never display stale or fabricated slots. |
| Next-available visibility | Put the next available day and a few grouped slots near the top of booking. |
| Appointment management | Keep upcoming/past separation, clear status, reschedule/cancel actions, and appointment preparation. |
| Family/dependent management | Maintain child profiles and guardian links, but enforce server-side scope and never infer authority from the client. |
| Centralized records | Show only clinician-published, guardian-authorized records. Keep prescriptions and internal notes separated. |
| Reminders and messaging | Keep communication review-first and in-app unless the owner explicitly approves a paid/provider integration. Never claim delivery or read status without evidence. |
| Health documents | Keep exports child-scoped, auditable, and limited to the intended parent-visible content. |

## Responsive and Nepali text requirements

Treat long Nepali strings as first-class content, not an edge case. Test the longest likely labels, service names, closure notices, empty states, error messages, and button labels at narrow web widths and on small portrait devices.

The implementation must:

- Allow all headings, labels, buttons, chips, cards, notices, and navigation items to wrap naturally without clipping or horizontal scrolling.
- Avoid fixed-height text containers unless the content is intentionally truncated with an accessible disclosure.
- Use `flexWrap`, intrinsic content sizing, adequate line height, and responsive spacing rather than shrinking Nepali text to unreadable sizes.
- Keep primary buttons at least 44×44 points on native and aim for at least 24×24 CSS pixels with spacing on web, with larger targets for important actions.
- Preserve visible keyboard focus on web and logical tab order.
- Provide accessible labels, roles, state announcements, and keyboard-reachable dismissal for toasts, menus, dialogs, and status messages.
- Keep the main action reachable in the lower half of the mobile viewport without covering content.
- Verify 1.3× and 2.0× text settings using real iOS and Android devices before release; static tests are not a substitute for this check.
- Check right-to-left or unusual font fallback behavior only if it is introduced; do not add unnecessary font dependencies.

## Localization requirements

Use the existing language preference state and centralized parent-localization helpers. Every new public or parent-facing string must have a natural Nepali version and an English fallback. Do not translate medical credentials or legal/privacy wording literally if the result is unclear; prefer short, culturally natural language and request review from clinic staff for clinical terminology.

The Nepali mode must translate closure notices, holiday labels, booking states, appointment statuses, empty states, feedback labels, validation errors, profile actions, and accessibility labels. Keep clinician and super-admin operational controls in English unless explicitly requested, but ensure their user-facing error and status states are understandable and accessible.

## Privacy and authority constraints

Do not weaken the existing authority model:

- `thisispratha@gmail.com` remains the super-admin with repository, deployment, secrets, database, and server authority outside the normal clinic UI.
- `anilrajojha@pahs.edu.np` remains the clinic administrator with app-level clinical operations only.
- Guardian record access remains authenticated, email-bound, clinician-enrolled, server-scoped, and limited to linked clinician-published records.
- Parent/local family setup must not be presented as a cloud account unless the hosted authentication boundary is configured.
- Never put secrets, tokens, database URLs, raw patient exports, or raw logs in the UI, source, documentation, or prompt examples.
- Do not display a child’s name, medical history, prescription, or appointment details in public feedback, error logs, screenshots, or analytics.
- Do not claim that a notification, PDF, share action, print action, or export was delivered, read, retained, or deleted without evidence.

## Recommended implementation order

Implement in this order so polish does not obscure usability defects:

1. Create a route-by-route UI audit and record exact problems before changing code.
2. Refine the shared design tokens, typography hierarchy, spacing, radii, focus states, and responsive containers.
3. Refine the header, sidebar/mobile navigation, clinic wordmark, and language/theme controls.
4. Rebuild the parent Home and Booking visual hierarchy around one primary action and a clear stepper.
5. Give About, Appointments, Profile, and Guardian Records distinct content rhythms while reusing the same tokens.
6. Add the growth/milestone motif to empty states and progress feedback without adding clinical claims.
7. Improve clinician and super-admin density separately; do not force parent-friendly cards into operational tables.
8. Add or update deterministic tests for localized labels, long-string wrapping helpers, keyboard semantics, minimum targets, route guards, and child-scope boundaries.
9. Run TypeScript, lint, tests, and diff checks with the development watcher stopped if memory is constrained.
10. Perform visual review at desktop, narrow web, small portrait mobile, dark mode, Nepali, English, and large-text settings.

## Acceptance criteria

The redesign is ready for review only when all of the following are true:

- The first-use parent can understand the clinic, create/select a child, and reach safe booking without encountering demo identity or dead-end controls.
- Nepali-selected parent/public routes contain no accidental English UI fallback except approved proper nouns, credentials, addresses, URLs, and unavoidable technical terms.
- Long Nepali strings wrap correctly on narrow web and small portrait layouts.
- The booking flow shows only schedule-valid, available slots and clearly explains modified hours or closures.
- Parent, guardian, clinician, and super-admin routes retain distinct information architecture and server-side authorization.
- The guardian portal never exposes another child’s data or clinician-only content.
- Accessibility labels, focus states, keyboard navigation, screen-reader status announcements, touch targets, and contrast remain intact.
- Dark mode does not reduce contrast or hide status meanings.
- No paid messaging, new external API key, automatic patient communication, or unverified delivery/read claim is introduced.
- The project passes `pnpm check`, `pnpm lint`, `pnpm test`, and `git diff --check`.
- Before publication, the owner separately provides a compatible HTTPS API/auth host and performs live super-admin, clinician, guardian-test, map-action, and real-device text-scale checks.

## Deliverables

Produce:

1. A concise route-by-route UI audit with screenshots or reproducible observations.
2. Updated design tokens and layout rules in the existing design source of truth.
3. Implemented UI changes in the existing repository without scaffolding a new app.
4. Deterministic tests for responsive Nepali text, accessibility semantics, and protected role boundaries.
5. A checkpoint with validation results and explicit remaining live-release tasks.

Do not publish the application during this work. Do not use owner credentials, create another Expo project, or perform live role-login testing without explicit owner-controlled setup.

## References

[1]: https://www.zocdoc.com/ "Zocdoc patient marketplace"
[2]: https://www.zocdoc.com/business/website-scheduling/ "Zocdoc website scheduling"
[3]: https://www.practo.com/health-app "Practo health app"
[4]: https://play.google.com/store/apps/details?id=fr.doctolib.www&hl=en_US "Doctolib Google Play listing"
[5]: https://www.w3.org/TR/wcag2mobile-22/ "W3C Guidance on Applying WCAG 2.2 to Mobile Applications"
[6]: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html "W3C WCAG 2.2 Target Size Minimum"

The external product descriptions support general patterns such as real-time booking, next-available visibility, appointment management, family/dependent access, health records, reminders, and secure document handling. They do not establish that any one product is the world’s most downloaded doctor-appointment app, and they should not be treated as permission to copy proprietary branding or interface details.
