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
