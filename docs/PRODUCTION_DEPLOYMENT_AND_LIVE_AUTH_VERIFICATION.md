# Production Deployment and Live Authentication Verification

This runbook is for the **super-admin** of Rainbow Child Development Clinic. It covers the managed production release, protected environment setup, and a live verification of the two intended authority paths. It does not grant the clinic administrator database, source-control, server, or deployment access.

> **Scope boundary:** Perform the managed release only from the workspace and private `main` branch. Do not place secrets, patient exports, database dumps, OAuth tokens, or production configuration in Git, chat, screenshots, or a shared document.

## 1. Release readiness checklist

Use the following checklist before selecting **Publish** in the workspace. The checklist is deliberately ordered so that authority and data protections are confirmed before the live build is made available.

| Check | Super-admin action | Expected evidence |
|---|---|---|
| Source branch | Open private `acdcpc/appointment` and confirm the intended release is on `main`. | The latest reviewed commit is visible on `main`; no unresolved pull requests remain. |
| Project checkpoint | Open the latest workspace checkpoint and confirm the release notes describe the intended changes. | Checkpoint is available and Publish is enabled. |
| Validation | Run `pnpm check`, `pnpm lint`, and `pnpm test` from the reviewed release source. | TypeScript and tests pass. The existing module-type warning may be noted separately if it remains non-blocking. |
| Authority identifiers | Confirm the exact trusted OAuth email addresses in `server/clinic-authority.ts`. | `thisispratha@gmail.com` is super-admin; `anilrajojha@pahs.edu.np` is clinic administrator. |
| Secrets | Confirm production values live only in the workspace or host secret store. | No `.env` file, credentials, tokens, or database URL is committed. |
| Environment indicator | Set the non-secret build value `EXPO_PUBLIC_APP_ENV=production` for the production release. | Navigation displays **Live environment**; preview builds remain visibly Staging or Local. |
| Database | Confirm a current backup and review every pending Drizzle migration before applying it. | Backup reference and migration review record are retained outside patient-facing screens. |
| Public information | Confirm clinic name, phone, email, hours, address, and map link are accurate in the production settings. | Public pages show the approved information; no placeholder location remains. |
| Recovery | Confirm the super-admin can reach the private repository, checkpoint history, and database backup process. | Recovery contacts and paths are documented privately. |

## 2. Managed production publishing

The recommended release method is the managed workspace flow. It creates the supported web and mobile build artefacts without requiring a local Android build in this repository.

| Step | Action | Safety check |
|---|---|---|
| 1 | Open the project workspace and select the latest reviewed checkpoint. | Confirm the checkpoint is the intended release, not an older version. |
| 2 | Open **Settings → Secrets** and verify that required values are present in the protected store. | Do not copy secret values into a local note, issue, or chat. |
| 3 | Open the project preview and confirm it loads before publishing. | Treat preview access as pre-release verification, not production approval. |
| 4 | Select **Publish** in the workspace and wait for the managed build to complete. | Do not attempt to build an Android APK locally in the sandbox. |
| 5 | Record the resulting release version, publication time, and responsible super-admin in a private release log. | Keep the log free of patient data and secrets. |
| 6 | Open the published web build and use the generated mobile build or Expo workflow on a real device for the verification steps below. | Test with separate authenticated sessions for the two authority roles. |

## 3. Self-managed production environment baseline

Use this section only if the super-admin operates the hosting and database. The clinic administrator must not receive access to these controls.

| Area | Minimum production requirement | Ownership |
|---|---|---|
| Hosting | HTTPS reverse proxy, production process manager, health monitoring, and restricted administrative access. | Super-admin only |
| Database | Private network exposure, encrypted transport, least-privilege service account, regular backups, and tested restore process. | Super-admin only |
| Secrets | `DATABASE_URL`, `JWT_SECRET`, OAuth/runtime values, and any built-in service keys stored in a host secret manager. | Super-admin only |
| Schema changes | Reviewed Drizzle SQL, backup before execution, and maintenance-window application when appropriate. | Super-admin only |
| Source control | Private GitHub repository, protected `main`, pull requests, review, and passing validation before merge. | Super-admin only |
| Clinic operations | App-level schedules, day overrides, notices, appointment work, and approved clinical workflows. | Clinic administrator through the app only |

## 4. Live-build login verification

Use two separate browser profiles, private windows, or two devices so one OAuth session cannot affect the other. Do not use real patient data for this verification. Record only pass/fail, release version, time, and verifier in a private operational log.

### 4.1 Super-admin verification

Sign in through the published build with **`thisispratha@gmail.com`**. The email must be the exact account returned by OAuth; aliases and another signed-in account are not treated as the super-admin.

| Step | Expected result | Do not do |
|---|---|---|
| Open the published build and complete OAuth sign-in. | The app returns to the authenticated experience without an error loop. | Do not share a session or credentials. |
| Open the clinician entry point. | The navigation authority badge identifies **Super-Admin**. | Do not treat a visual badge alone as security proof. |
| Open the protected super-admin governance workspace. | System status, redacted governance activity, and application-level access controls load. | Do not expect database credentials, raw logs, SQL, secrets, deployment terminal, or repository files in the app. |
| Open the periodic access-review panel. | It shows a factual never-reviewed, due-soon, overdue, or scheduled state from persisted review evidence. | Do not claim the reminder was push-delivered or that a review is completed until it is explicitly recorded. |
| Open the CSV preparation register and run a bounded date/actor search. | Only preparation evidence appears: actor, range, count, policy context, and disclaimer. | Do not expect CSV contents, child information, local paths, or download/delivery proof. |
| Prepare a test CSV only if an approved non-production/test dataset is available. | The required scope and retention acknowledgements appear; preparation is audited. | Do not export production patient data merely to test a button. |

### 4.2 Clinic-administrator verification

End the super-admin session, then use a separate browser profile, private window, or device. Sign in with **`anilrajojha@pahs.edu.np`**.

| Step | Expected result | Security boundary to confirm |
|---|---|---|
| Complete OAuth sign-in using the exact clinic-administrator address. | The protected clinician experience opens. | The navigation badge identifies **Admin** or the clinic-administrator authority state. |
| Open the clinician dashboard. | Appointment, operational scheduling, and approved clinic settings are available. | These are app-level workflows, not direct database access. |
| Review a non-destructive settings screen such as hours or a day-specific override. | The screen loads and requires intentional save actions. | Do not create a live closure or change patient-facing hours solely for verification. |
| Attempt to open the super-admin governance route using its published route or navigation. | Access is refused or the super-admin-required state is shown. | Dr. Ojha must not receive super-admin, database, secrets, server, deployment, or repository controls. |
| Sign out and reopen the app. | The protected clinician session no longer remains active. | Do not leave a clinic device signed in unattended. |

### 4.3 Negative authority check

Use a third, non-trusted account only if an approved non-production account is available. It should not receive clinic administration by default. Confirm that it cannot open the super-admin workspace and cannot use clinical administration unless a server-linked staff role explicitly permits a restricted operation.

## 5. Go-live decision record

Document the result privately after verification. Do not include passwords, OAuth codes, database connection strings, patient data, or exported CSV content.

| Item | Record |
|---|---|
| Release version and publication time |  |
| Super-admin live sign-in pass/fail |  |
| Clinic-administrator live sign-in pass/fail |  |
| Super-admin route denial for clinic administrator pass/fail |  |
| Public clinic information pass/fail |  |
| Backup and restoration readiness confirmed |  |
| Outstanding issue, owner, and safe follow-up date |  |

> **Go-live rule:** If a trusted email resolves to the wrong authority, a protected route exposes unexpected information, the published build cannot authenticate, or a migration/backup status is uncertain, stop the release process and investigate as super-admin before relying on the build for clinic operations.

## 6. Supabase backend setup

> **Status: COMPLETE (2026-08-26)** for project `appointment`
> (ref `bpocsorqstqfessdclfh`). Migrations `0001`–`0002`, seed, Email auth
> (confirmations on), trusted users, grants, and the private bucket are live
> and verified by `node scripts/verify-supabase.mjs` (10/10). The steps below
> remain the reference for any future (re)build of the backend.

The Backend direction is **Supabase** (Postgres + Auth + Storage). Complete this
once per project, then build the app with the public variables injected.

1. Create a project at <https://supabase.com> (region near Nepal, e.g. `ap-south-1`), keep the DB password safe.
2. Note the **Project URL** and the **anon** + **service_role** keys (Project Settings → API).
3. Push the committed schema and seed:
   ```bash
   npx supabase@latest login
   npx supabase@latest link --project-ref <project-ref>
   npx supabase@latest db push                 # applies supabase/migrations/0001_init.sql
   # then run supabase/seed.sql in the SQL Editor (do not use db reset on hosted)
   ```
4. Authentication → Email: enable with **Confirm email = on**; set Site URL to the
   future web URL and add `http://localhost:8081` as a redirect for local testing.
5. Create the two trusted users (`anilrajojha@pahs.edu.np`, `thisispratha@gmail.com`),
   then in SQL Editor: `update public.users set role = 'admin' where email = 'anilrajojha@pahs.edu.np';`
6. Verify the private `patient-documents` bucket exists; keep it private.
7. Set environment values (never commit them): client builds need
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; the server also
   reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (service role is server-only).

## 7. Web/PWA and Android publishing (outside the managed flow)

- **Web + PWA (iOS path):** run `npx expo export --platform web`, host `dist/` on
  Vercel/Netlify/Cloudflare Pages, set the `EXPO_PUBLIC_*` values, redeploy. Verify
  `/manifest.json` in DevTools; iOS Safari users use **Add to Home Screen**
  (standalone, HTTPS required).
- **Android:** `npm i -g eas-cli && eas login`, ensure `eas.json` (preview =
  internal APK, production = store AAB) and the `EXPO_PUBLIC_*` values are
  available to the build, then `eas build -p android --profile preview`. Package
  `com.app.appointment` is preconfigured. Upload the AAB to Play Console for release.
- **iOS later:** the same PWA covers the launch phase; when a native app is
  wanted, `eas build -p ios` is configured via `eas.json` (App Store submission).

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Client logs "Supabase not configured" | `EXPO_PUBLIC_*` missing at build time | Add to hosting/EAS env, rebuild |
| `db push` fails auth | CLI not linked / DB password mismatch | `supabase link --project-ref <ref>`, then `supabase db push -p <db password>` |
| RLS blocks inserts for the clinic admin | `role='admin'` row missing | Run the `update public.users ...` statement in §6 step 5 |
| Confirmation email never arrives | Email confirm disabled / provider unverified | Enable Email provider + confirm; check Inbucket in local dev |
| PWA not installable on iOS | Not HTTPS or no manifest | Host on HTTPS; iOS ≥ 16.4; verify manifest |
| EAS build missing env | Env scoped to the wrong profile | `eas env:list`, rebuild with the profile that has the env |
