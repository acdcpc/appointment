# Running Dr. Anil Ojha Child Care

This guide covers the Expo mobile experience, the browser-based web experience, and the managed published version. The project source is available at [acdcpc/appointment](https://github.com/acdcpc/appointment).

## 1. Requirements

Install **Node.js 22 or later** and **pnpm 9**. Use a current Chromium-based browser for the web experience. For native testing, install **Expo Go** on an iPhone or Android device, or configure an iOS Simulator / Android Emulator on the development computer.

| Tool | Check command | Purpose |
|---|---|---|
| Node.js | `node --version` | Runs the Expo and API development processes. |
| pnpm | `pnpm --version` | Installs and runs project packages. |
| Git | `git --version` | Clones and updates the repository. |
| Expo Go or simulator | Device-specific | Opens the native mobile build during development. |

## 2. Download and install the project

Run the following commands in a terminal. Replace the folder path if you prefer a different workspace.

```bash
git clone https://github.com/acdcpc/appointment.git
cd appointment
pnpm install
```

To update an existing copy later, run:

```bash
cd appointment
git pull origin main
pnpm install
```

## 2b. Optional: point the app at Supabase

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` (plus `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
for the server). Apply the schema and seed from `supabase/` as described in
`docs/PRODUCTION_DEPLOYMENT_AND_LIVE_AUTH_VERIFICATION.md` §2. Without these
values the app runs on local sample data.

## 2c. Web + PWA build

```bash
npx expo export --platform web    # outputs dist/ (static PWA)
```

Host `dist/` on any static host (Vercel, Netlify, Cloudflare Pages). The build
includes a web manifest, so Android Chrome can install the app and iOS Safari
can use **Add to Home Screen**.

## 3. Run the browser-based web experience locally


Start the API and Expo web server together:

```bash
pnpm dev
```

After the terminal reports that Metro is ready, open **http://localhost:8081** in a browser. Keep the terminal running while using the site. Press `Ctrl+C` in that terminal to stop both development processes.

> The patient-facing screens work from the project’s local sample data. Clinician login, database-backed audit retention, retry enforcement, and scheduled monitoring require the authenticated managed backend configuration used by the published project.

## 4. Run the mobile experience during development

Use two terminals from the project folder. Start the API in the first terminal:

```bash
pnpm dev:server
```

Start Expo for a native device in the second terminal:

```bash
npx expo start
```

Then use one of these options:

| Target | Action |
|---|---|
| Physical iPhone or Android device | Open Expo Go and scan the QR code shown by Expo. Ensure the device and computer are on the same network. |
| Android Emulator | Press `a` in the Expo terminal after the emulator is running. |
| iOS Simulator on macOS | Press `i` in the Expo terminal after Xcode and a simulator are available. |

## 5. Run the managed web and mobile version

In the project workspace, open the latest checkpoint and select **Publish**. The published build provides the managed backend, database, OAuth clinician access, and the browser preview. For mobile, open the project preview and scan its Expo QR code using Expo Go.

After publishing, sign in with Dr. Ojha’s approved clinician account. In the clinician workspace, select **Enable automatic 24-hour check** once to activate the hourly unresolved-referral monitor. The monitor records notification state so a qualifying referral generates only one clinician alert unless a later failed attempt creates a new unresolved event.

In **Audit retention & archive**, first save the clinic-approved retention period. Then select **Enable automatic archive** to activate the daily non-destructive archival job. The dashboard shows stored, active, and archived audit-record counts plus recent archive activity. You can pause or resume either scheduled control later; paused jobs do not alter stored records.

## 6. Validate changes before sharing them

Run the project checks after code changes:

```bash
pnpm check
pnpm lint
pnpm test
```

For database schema changes, generate and review the migration before applying it to the managed database:

```bash
pnpm drizzle-kit generate
```

## 7. Working with audit retention

Open the protected clinician workspace and use **Audit retention & archive**. Enter the clinic-approved number of retention days, save it, review the eligible-record count, add an archive note, and explicitly confirm the archive action. The archive operation is non-destructive: the clinician audit log continues to show archived records, their archive date, the responsible clinician, and the archive note.

The app does not decide the legally appropriate retention duration. Confirm the clinic’s privacy, clinical-governance, and legal requirements before setting or applying this policy.
