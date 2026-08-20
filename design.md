# Appointment Clinic App — Mobile Interface Design

## Product Direction

Dr. Anil Ojha Child Care is a calm, trustworthy scheduling experience for the single-doctor pediatric and child-development practice of **Associate Professor Dr. Anil Ojha**. The interface follows mainstream iOS patterns: a soft neutral canvas, large readable type, grouped cards, clear primary actions, and one-handed portrait interactions. The mobile app and Expo web experience share the same patient booking language, centered on one clinician rather than provider discovery.

## Screen List

| Screen | Primary content and functionality |
|---|---|
| Home | Greeting, clinic status, next appointment card, quick actions for finding a doctor and viewing appointments, plus service shortcuts. |
| Book a Visit | Pediatric service choices, child-development care choices, and a clear route to Dr. Ojha’s profile and available times. |
| Doctor Profile | Dr. Ojha’s photo/avatar, pediatric and child-development specialty, bio, service picker, and availability CTA. |
| Choose Time | Date strip, time-slot grid, visit-type selector, and confirmation CTA. |
| Booking Confirmation | Success state with appointment details, add-to-calendar/share actions, and route to appointments. |
| Appointments | Segmented upcoming/past list, appointment cards, cancel/reschedule actions, and empty state. |
| Appointment Detail | Clinic address, doctor/service details, status, intake form entry point, and document area. |
| Intake Form | Reason for visit, symptoms, medications, allergies, consent, validation, and save/submit actions. |
| Doctor Schedule | Today/upcoming timeline, appointment status actions, and patient intake preview. |
| Clinic Admin | Operational summary, schedule overview, doctor/service shortcuts, waitlist snapshot, and reporting cards. |
| Profile & Settings | Patient identity, dependents placeholder, notifications, privacy, and support links. |

## Key User Flows

### Patient booking flow

1. The parent or guardian opens Home and taps **Book a visit**.
2. The parent or guardian selects a pediatric or child-development service.
3. The parent or guardian reviews Dr. Ojha’s profile and taps **Choose a time**.
4. The patient selects a date, an available slot, and either in-clinic or video consultation when enabled.
5. The patient confirms the booking and sees the success screen.
6. The patient opens the appointment detail and optionally completes the pre-visit intake form.

### Appointment management flow

1. The patient opens Appointments and selects an upcoming visit.
2. The patient reviews time, location, status, and intake completion.
3. The patient can reschedule to another available slot or cancel within clinic policy.
4. The app returns the patient to the updated appointment list with clear feedback.

### Doctor flow

1. Dr. Ojha opens Doctor Schedule and sees today’s timeline.
2. The doctor taps an appointment to view patient intake information.
3. The doctor marks the visit completed or no-show and can attach a note/document in the production backend-enabled version.

### Admin flow

1. Front-desk staff opens Clinic Admin and reviews today’s bookings, utilization, and waitlist.
2. Staff opens Dr. Ojha’s master schedule and manages appointments for one clinician.
3. Staff can move to pediatric service management and manual booking in the backend-enabled version.

## Visual System

| Element | Choice |
|---|---|
| Brand primary | Deep teal `#0E7490`, communicating clinical trust without feeling sterile. |
| Accent | Warm coral `#F97360`, reserved for important actions and appointment highlights. |
| Canvas | Cool ivory `#F7FAFC`, keeping cards legible and reducing glare. |
| Surface | White `#FFFFFF`, with subtle slate borders and restrained shadows. |
| Primary text | Ink navy `#102A43`; secondary text `#627D98`. |
| Positive state | Fresh green `#2F855A`; warning `#C27C0E`; error `#C53030`. |
| Typography | iOS-style system sans with large title hierarchy, 17pt body baseline, and generous line height. |
| Shape language | 16–24pt rounded cards, 12pt chips, and 14pt primary buttons for comfortable touch targets. |

## Interaction Principles

The app uses a bottom tab bar for Home, Find Care, Appointments, and Profile. Secondary workflows open with stack navigation or a sheet-like detail screen. Primary actions remain reachable near the lower half of the viewport. Every action provides a visible state change, disabled/loading treatment, or confirmation. Accessibility labels and sufficient contrast are required for controls, status badges, and icon-only actions.

## Pediatric Booking and Record Extensions

The revised home screen acts as a parent-friendly care hub for Dr. Ojha’s practice. It places the next appointment, direct booking, a child wellbeing summary, and clinician records in the first viewport. The booking flow gathers only scheduling-ready details: the child, requested pediatric service, preferred date and time, and a short parent concern. It creates a scheduled appointment in shared app state and returns a confirmation with a route to appointment management.

| Domain model | Core fields | Intended use |
|---|---|---|
| Child profile | `id`, `name`, `dateOfBirth`, `allergies`, `parentName` | Select the child for booking and associate each health record with the correct patient. |
| Appointment | `id`, `childId`, `service`, `date`, `time`, `reason`, `status` | Create, review, and reschedule pediatric visits without double-booking the same local time slot. |
| Prescription | `id`, `childId`, `appointmentId`, `issuedOn`, `medication`, `instructions`, `status` | Present a clinician-issued medication record with the appointment context. The prototype does not calculate a dose or offer treatment advice. |
| Medical history entry | `id`, `childId`, `category`, `title`, `occurredOn`, `note` | Show allergies, prior visits, development observations, and parent-provided history in chronological order. |

The prototype retains the sensitive pediatric data only in in-memory app state with fictional example records. A production release must move the data to an authenticated backend with patient-scoped access controls, audit trails, and an explicit clinician-authoring workflow.

## Clinician Operations and Export Design

The clinician workspace is a dedicated, role-oriented screen for Dr. Ojha. It prioritizes today’s queue, appointments needing intake review, configurable clinic hours, and service durations. The initial hours are an editable draft rather than a public claim about the practice; Dr. Ojha must set the final daily opening and closing times before production release. Parent booking uses only slots generated inside the active daily window and reserves the full service duration before confirmation.

| Screen or action | Layout and behavior |
|---|---|
| Clinician dashboard | A compact day summary followed by appointment cards, the child’s reason for visit, and a clear route into child records. |
| Clinic hours | One row per weekday, with active/closed control and editable start/end fields in 24-hour format. |
| Service duration | Pediatric consultation, child development review, and growth/wellbeing each expose a selectable 20, 30, 45, or 60 minute duration. |
| Parent PDF export | The Records screen displays an **Export PDF** action. On iOS/Android it creates a record-summary PDF and offers the native share/download sheet. On web it opens a printable document so the parent can save it as a PDF. |

The export includes only the active child’s parent-visible medical history and prescriptions. It uses plain, printable clinic styling and excludes internal notes, credentials, and other child records.

## Clinician Protection and Availability Exceptions

The clinician workspace now begins with a dedicated sign-in boundary. It uses the project’s existing secure OAuth session and a server-side administrator check before rendering Dr. Ojha’s dashboard or authoring controls. Parent views remain separate and never expose clinician authoring actions. In production, the account used by Dr. Ojha must be assigned the clinician administrator role before access is granted.

| Setting | Dashboard control | Scheduling effect |
|---|---|---|
| Daily break | A weekday-bound start and end time; optional per day | Slots that overlap the interval are not shown for booking or rescheduling. |
| Clinic holiday | A date with a short label; removable in draft mode | Parent booking and rescheduling return no slots for that date. |
| PDF export feedback | Button-specific loading indicator followed by a success notice | Parents receive a clear message when the printable/exportable document is ready. |

The dashboard labels breaks, hours, and holidays as clinician-managed configuration. Existing appointments are not silently moved when a new exception is entered; the dashboard should surface them for manual follow-up.

## Calendar, Patient Search, and AI Review Design

The clinician dashboard includes a compact calendar switcher. **Day** view displays a time-grid list with appointment cards at their scheduled hour, while **Week** view uses five weekday columns for a scanning-friendly overview. Appointment cards keep the child name, service, time, and duration visible without exposing unnecessary details.

Patient search is placed above clinician records. It filters the fictional prototype data by child name, parent/guardian name, visit reason, visible history title, and prescription name. Selecting a result changes the active child context and shows that child’s appointments, record history, and past parent-visible prescriptions.

The AI documentation assistant is intentionally review-first. Dr. Ojha pastes consultation notes, receives a concise note summary and an extraction-only prescription draft, then reviews and edits all fields before tapping the existing save action. The assistant never auto-saves, offers dose calculation, diagnoses, or creates treatment decisions. Its output is labeled as AI-assisted and untrusted until the clinician approves it.

## Conflict-Safe Calendar and Child Timeline

The clinician calendar evaluates each active appointment against other appointments on the same date. A card becomes visually distinct when its start and end interval intersects another visit. A summary banner lists the number of overlaps and instructs Dr. Ojha to review the affected bookings before making a change. Existing confirmed appointments are never auto-moved by the warning.

The selected child’s clinical history appears as a chronological timeline below search results. Each entry is clearly labeled as one of four types: **Visit**, **Prescription**, **Medical history**, or **Growth**. Growth cards show parent- or clinician-recorded height and weight snapshots only; they do not infer diagnosis, percentile, treatment, or clinical interpretation. Prescription entries retain their recorded status and directions, while visit and history cards retain their original notes.

## Conflict Actions, Growth Trends, and Timeline Export

Every red overlap card in the clinician calendar now offers **Reschedule** and **Cancel** actions. Rescheduling opens the established booking path with the selected visit context, and the availability engine remains the source of truth for replacement slots. Cancellation requires an explicit confirmation step and keeps an audit-ready status rather than silently deleting the booking.

The active child timeline includes two concise, independently scaled line charts: one for **Height (cm)** and one for **Weight (kg)**. Every point remains traceable to its recorded date and value. The chart is a visual record of measurements only and does not calculate percentiles, diagnose a growth pattern, or provide care guidance.

The timeline export action produces a child-scoped, clean referral or parent summary. It contains visible timeline events, prescription records, and factual growth measurements. Internal notes, clinician-only workflow data, and other children’s data are excluded.

## Confirmation Messages, WHO Context, and Referral Builder

When Dr. Ojha selects **Reschedule** or **Cancel** on a conflicted calendar card, the dashboard shows a deliberate confirmation sheet. The sheet includes an optional parent-facing message, a clear statement of the proposed change, and only applies the change after the clinician confirms a new validated slot or cancellation. The prototype stores the message with the appointment change.

The clinician dashboard separates factual growth trends from **WHO reference context**. The reference panel selects the source curve by the recorded child sex and age in months, overlays observed points in teal, and labels P3, P50, and P97 as reference curves only. The UI does not calculate a patient percentile, diagnosis, or recommendation.

The dashboard settings area includes a referral template builder. Dr. Ojha can edit recipient, purpose, and letter body; preview a personalized child-scoped letter; then print or export it only after review. The template excludes clinician-only notes and unrelated patient data.

## Referral Address Book, Older WHO References, and Audit Log

The referral template builder contains a clinician-managed address book. A saved entry holds a service name, recipient, organisation, and default purpose. Selecting an entry pre-fills the referral letter; removing an entry requires an explicit action. Address-book entries remain clinic configuration, not patient data.

For children aged 5–19, the height chart uses the verified WHO 2007 height-for-age reference. Weight-for-age is displayed only through 10 years; it is intentionally withheld after that limit rather than extrapolated. Observed measurements remain distinct from reference curves, and the interface offers no diagnosis, percentile claim, or treatment recommendation.

The Child Records screen includes a child-scoped **Patient audit log**. It lists factual clinician appointment-change events, optional parent-facing messages, and generated referral letters. The log excludes unrelated child data and clinician-only notes.

## Clinician Audit Controls and Referral Administration

Detailed audit events are visible only in Dr. Ojha’s protected clinician dashboard. The clinician can filter the active child’s events by appointment change or referral letter, then print or export the filtered subset. Parent-facing Child Records shows only a privacy notice, not event details.

The referral builder provides clinic identity, contact, signature name, and signature-title settings. These settings are rendered in the preview and exported referral letter, so the clinician can review them alongside recipient and letter body before export.

The referral-service address book has a service, recipient, and organisation search field. Results are filtered locally and selecting a result pre-fills the template; removal remains an explicit clinician action.

## Staff Roles and Referral Email Drafts

The clinician settings workflow includes a staff-role matrix for receptionists, nurses, and clinicians. Reception is limited to appointment-change audit events, nurses can view appointment-change events and referral metadata, and clinicians retain full child-scoped audit filtering and export. The UI makes each level visible and does not place role-management controls in parent-facing screens.

The referral builder may prefill a selected specialist’s email address from the address book. **Quick share** creates a clinician-reviewed email draft with a child-scoped referral attachment; it does not send an email automatically. The specialist recipient, subject, body, and letter attachment remain reviewable in the device mail client before sending.

## Specialist Approval, Invitations, and Email-Share Audit

New specialist address-book entries begin as **Pending clinician approval**. Dr. Ojha can approve, reject, or remove a contact before it can populate a referral email. The sharing action accepts only an approved saved specialist contact, avoiding unverified recipient selection.

Staff management distinguishes **active staff** from **pending invitations**. An invitation records an email address and proposed role but remains pending until an authenticated account-provisioning workflow is connected.

The clinician audit log includes a dedicated **Email shares** filter. It lists the platform-reported status—such as draft opened, sent, saved, cancelled, or unavailable—without claiming delivery success when the platform cannot determine it.

## Dashboard Notifications, Contact History, and Email Resend

The clinician dashboard includes a compact notifications widget for **pending specialist-contact approvals** and **pending staff invitations**. It displays only counts and directs Dr. Ojha to the relevant management area.

The referral address book includes a **History** tab for previously approved and rejected contacts. The history preserves explicit decision status and keeps rejected contacts out of selection flows.

For a cancelled or unavailable referral email-share event, the clinician audit log provides **Resend draft**. It verifies that the recorded specialist is still an approved contact, then opens another reviewable mail draft for the active child rather than sending automatically.

## Deep-linked Action Alerts and Resend Limits

The pending-actions widget now uses protected in-app links. **Contact approvals** opens the referral address-book queue, while **Staff invitations** opens pending team invitations. The selected management surface appears near the top of the clinician workspace for one-handed use.

Approved and rejected contact history entries show the decision maker and recorded decision time. A failed referral email share shows its number of clinician-reviewed retry attempts out of three; the resend draft control visibly disables once the limit is reached.

## Referral Delivery Alerts and Approval Activity

An unresolved referral-delivery badge is positioned immediately below the clinician metrics row, before the longer dashboard content. It uses the error color, reports only unresolved cancelled or unavailable email-share events for the active child, and opens the protected **Email shares** audit filter when tapped.

The clinician workspace includes a compact **Approval activity** feed. Each chronological item names the staff member who approved or rejected a specialist contact, the action, contact identity, and an exact recorded time. It remains clinician-only and is deliberately separate from parent-visible child records.

Email-share audit cards show the exact local attempt time in addition to the platform-reported outcome. A clearly labeled **Server policy: maximum three clinician-reviewed resend attempts** line explains the retry ceiling; the UI can only open a reviewable email draft when the authenticated server policy has accepted the retry request.

## Durable Referral Oversight and Filtered Audit Exports

Referral audit events and resend usage are durable clinician-owned records rather than screen-local state. The clinician dashboard continues to show only child-scoped, actionable failure counts while the server retains attempts, decision metadata, and alert state across restarts.

An automatic background check evaluates unresolved cancelled or unavailable referral attempts after **24 hours**. It sends one clinician notification for each qualifying unresolved event and records the notification timestamp to prevent duplicate alerts. A new failed attempt is treated as a separate, reviewable audit event.

The clinician audit log places inclusive date-range inputs and a staff-action filter directly above the export action. Exports state the applied time range and staff-action scope in their header, so printed or saved documents retain the context in which the clinician filtered them.

## Audit Retention and Archive Settings

The clinician workspace includes an **Audit retention & archive** card inside its protected settings area. Dr. Ojha enters a clinic-approved number of days rather than selecting a presumed legal default. The screen clearly states that the clinic must confirm its privacy, clinical-governance, and legal retention obligations before applying a policy.

The screen previews how many clinician audit records are past the configured retention period and requires a written archive note plus an explicit confirmation before archiving. Archiving is non-destructive: records remain accessible to clinicians and exports visibly identify their archive date and responsible clinician. No parent-facing screen exposes this setting or archived audit metadata.

## Automated Retention Monitoring Dashboard

After the published clinician account selects **Enable automatic 24-hour check**, the protected settings screen treats the activation as a single managed schedule. Each hour it reviews unresolved referral deliveries and applies the already-saved retention policy to archive eligible audit records without deletion. The interface differentiates the alert state and archival state, shows the next scheduled run, and allows the clinician to pause or resume future background work.

The retention card presents small, one-handed-friendly metric tiles for total stored audit records, active records, archived records, and a compact list of recent archive runs. These figures are aggregate counts only; they never reveal child names or clinical detail outside the existing protected audit log.
