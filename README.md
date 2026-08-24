# Rainbow Child Development Clinic

This repository contains the mobile and web application for **Rainbow Child Development Clinic**, led by Associate Professor Dr. Anil Ojha, MBBS, MD, FCCH, Developmental Pediatrician. It supports clinic schedules, clinician-reviewed appointments, parent-facing notices, protected records, and operational reporting.

> **Security principle:** patient data, database credentials, production configuration, deployment credentials, and source-control administration remain outside the clinical dashboard. The app does not grant any user a direct database connection or server shell.

## Authority model

The API evaluates the authenticated OAuth email on the server. Client-side screens do not decide authority. The intended division is below.

| Account | Server-recognized role | Permitted scope | Not permitted through the app |
|---|---|---|---|
| `thisispratha@gmail.com` | **Super-admin** | Private repository, deployment, secrets, database administration, server configuration, recovery, and all source files through GitHub | None of the normal app-level restrictions; protect this account with MFA and a private device |
| `anilrajojha@pahs.edu.np` | **Clinic administrator** | Clinician dashboard, appointment operations, clinic hours, individual-day overrides, family-facing notices, and other approved clinic workflows | Database credentials, database console, server environment variables, deployment controls, source-control administration, and server code changes |
| Other signed-in accounts | **No clinic administration by default** | Only an explicitly activated, server-linked staff role where the feature permits it | Clinician administration, direct records administration, database, server, or repository access |

Dr. Ojha’s in-app operational changes are stored through validated API routes so clinic workflows can work. They are **not** direct database access and cannot alter server code, deployment secrets, or database infrastructure. Changes to server code, schema, secrets, or production database settings require the super-admin’s external access and review.

## First access setup

Both trusted users should sign in once using the exact addresses above through the application’s OAuth sign-in flow. Email comparison is case-insensitive, but aliases or another email address will not receive the same role.

1. Sign in as `thisispratha@gmail.com`. This account is the super-admin account in the application’s authority checks.
2. Sign in as `anilrajojha@pahs.edu.np`. This account opens the clinic-administrator dashboard and does not receive database, server, or repository controls.
3. Do **not** share either account. Enable multi-factor authentication for the email and GitHub account used by the super-admin.
4. If a trusted email changes, update `server/clinic-authority.ts`, run validation, review the change as super-admin, and deploy it before relying on the new identity.

## GitHub repository access

The intended private repository is [acdcpc/appointment](https://github.com/acdcpc/appointment). GitHub permissions are separate from the app’s email checks.

1. Sign in to GitHub with the account that represents `thisispratha@gmail.com`.
2. Open the repository’s **Settings → Collaborators and teams** page.
3. Invite the super-admin’s **GitHub username** with the **Maintain** or **Admin** role. GitHub invitations use an account identity; an email address alone may not identify the correct GitHub user.
4. Keep the repository private. Do not give Dr. Ojha write, maintain, or admin repository access unless the super-admin intentionally changes this policy.
5. Protect the `main` branch: require pull requests, at least one review, and passing checks before merging.

> GitHub access gives the super-admin the ability to inspect every committed file. Do not commit `.env` files, database dumps, OAuth tokens, patient exports, QR references, or other secrets.

## Managed deployment through the application workspace

The recommended route for this project is the managed publish workflow.

1. Review the latest checkpoint in the workspace.
2. Confirm that the project has no TypeScript, lint, or test failures.
3. Open the **Publish** control in the workspace interface and initiate the managed build.
4. Use the generated web preview for browser validation and the Expo QR workflow for mobile-device testing.
5. Keep production secrets in the workspace’s protected Secrets settings, never in source code or chat messages.

Publishing creates the production build. For Android, use the managed publish process to generate the APK rather than attempting a local Android build in this repository.

## Self-managed deployment checklist

Use this route only when the super-admin controls the hosting, database, backups, domain, and monitoring.

| Step | Super-admin action |
|---|---|
| 1. Clone | `gh repo clone acdcpc/appointment` and `cd appointment` |
| 2. Install | `pnpm install --frozen-lockfile` |
| 3. Validate | `pnpm check && pnpm lint && pnpm test` |
| 4. Configure secrets | Add production-only environment variables in the host’s secret manager; never commit them |
| 5. Migrate database | Review generated Drizzle SQL, back up the database, then apply approved migrations in a maintenance window |
| 6. Build server | `pnpm build` |
| 7. Start server | `NODE_ENV=production pnpm start` behind HTTPS and a reverse proxy |
| 8. Deploy mobile/web | Build through the managed Expo workflow or a separately configured Expo build pipeline |
| 9. Verify | Confirm OAuth, restricted clinic login, parent record verification, clinic public details, and database backups |

The backend reads the following environment variable names. Set values only in a protected host or workspace secret store.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Private database connection string; super-admin only |
| `JWT_SECRET` | Cookie/session signing secret; super-admin only |
| `VITE_APP_ID` | Application identifier used by the runtime |
| `OAUTH_SERVER_URL` | OAuth service endpoint |
| `OWNER_OPEN_ID` | Platform owner identifier; do not expose it to clinic users |
| `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` | Built-in service integration values, if configured by the platform |

## Database safety

The database must not be publicly reachable. Allow access only from the production server and the super-admin’s controlled administrative path. Use encrypted connections, least-privilege database accounts, routine backups, and a tested restoration procedure. Before any schema migration, create a backup and review the generated SQL for destructive operations.

Dr. Ojha uses the clinic dashboard for operational information such as schedules, hours, and notices. The dashboard intentionally does not provide a database console, SQL editor, environment-variable editor, deployment terminal, or source-file browser.

## Routine release process

1. Create a feature branch as super-admin.
2. Make the smallest reviewed change needed for the clinic.
3. Run `pnpm check`, `pnpm lint`, and `pnpm test`.
4. Review database migrations separately and back up before application.
5. Commit with a clear message, push the branch, and open a pull request.
6. Review and merge through the protected `main` branch.
7. Create a checkpoint and publish through the managed workspace.
8. Record release notes without patient data or secrets.

## Important safety behavior

The application does not automatically send patient communications, reschedule appointments, interpret an acknowledgement as clinical consent, or claim that an export/print action proves delivery. Modified-hours notices are in-app information only. A clinician must review any follow-up action.
