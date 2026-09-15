# Route matrix — before / after the UI redesign pass

Comparison basis: "before" is the pre-redesign state as described at the
`00526f8` audit; "after" is the state in this checkout at the commit that adds
this file. Every "after" claim is verifiable in the named file in this checkout.

| Route | Before | After (this checkout) | Distinct composition |
|---|---|---|---|
| **Home** `app/(tabs)/index.tsx` | Emoji/letter mark, then child-card-first card wall; each section an equally weighted white card | Clinic icon + wordmark with doctor credentials; **next-visit / first-use state leads** directly under the header, child context second; one dominant coral booking CTA; shortcuts, care plan and a single clinic-contact row in the side/secondary zone | State-led: *what is happening next*, then context |
| **Booking** `app/booking.tsx` | Long single scroll; primary action could scroll out of view; coral CTA carried white text | Focused stepper (Visit · Time · Confirm) with only valid available slots, modified-hours notice near affected dates, pill CTA with ink-on-coral text, bottom-safe action, and a draft that survives leaving the flow | Task stepper: one decision per step |
| **About** `app/about.tsx` | Generic information dump | Clinic profile rhythm: credential/wordmark block, hours, closure calendar, contact and map actions | Profile sheet: who/where/when |
| **Appointments** `app/(tabs)/appointments.tsx` | Every appointment rendered identically; no past/upcoming distinction | Status-labelled rows with explicit **past-visit closure wording** (summary waiting, or "nothing further is needed") and reschedule only where valid | Operational list: status first |
| **Family profile** `app/(tabs)/profile.tsx` | Hardcoded demo identity; dead rows; no controls | Real session identity, working child editor, appearance + text-size controls, account deletion isolated in a danger zone | Settings groups: account → children → preferences → danger |
| **Onboarding** `app/onboarding.tsx` | Emoji hero with feature cards; privacy footnote buried | Clinic icon, growth/milestone motif, credential banner, three plain value statements, "Get started" / "Explore" with the privacy note directly under the CTAs | Welcome narrative: why this clinic |
| **Guardian records** `app/(tabs)/records.tsx` | Implicit child scope; cool tints from the rethemed palette | Explicit child scope header; status tokens; a sign-in state instead of demo data when no linked child | Document view: one child, their files |

## Not touched in design passes

Clinician (`app/clinician.tsx`) and super-admin (`app/super-admin.tsx`) remain
structured operational workspaces — tables, filters, schedule density and
role/status information. No authorization behaviour was modified while doing
visual work.

## Still unverified (stated, not implied)

Visual review on desktop web, narrow web, small portrait, Nepali vs English,
dark mode, and 1.3×–2.0× text scale; real-device app-kill test of the booking
draft; live role logins; publication. See `docs/KNOWN_GAPS_AND_DECISIONS.md`.
