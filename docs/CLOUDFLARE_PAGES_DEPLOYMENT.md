# Cloudflare Pages deployment (live)

The parent app is published on Cloudflare Pages because the Netlify account is
blocked by exhausted credits (Netlify refuses both repository builds and CLI/API
uploads while that is unresolved).

| | |
|---|---|
| **Production URL** | <https://rainbowclinic.pages.dev> |
| Project | `rainbowclinic` (production branch `main`) |
| Cloudflare account | `af2b9f1c08d61217639710b16b5ca249` |
| Preview deploys | e.g. <https://120f5455.rainbowclinic.pages.dev> |

## How this was published

```bash
npx wrangler login                       # browser OAuth, one "Allow" click
npx wrangler pages project create rainbowclinic --production-branch=main
pnpm exec expo export --platform web
npx wrangler pages deploy dist --project-name=rainbowclinic --branch=main
```

`public/_redirects` (`/* /index.html 200`) ships inside `dist/`, so client-side
routes work without extra Pages configuration.

## Verified after publishing (2026-09-16)

- `https://rainbowclinic.pages.dev/` → **HTTP 200**; preview URL → **HTTP 200**
- Served HTML contains the clinic name; shell size 22,340 bytes
- Deep routes: `/parent-auth` → **200**, `/profile` → **200** (SPA fallback working)
- Deployed bundle (3.75 MB): Supabase project ref present, embedded anon key is
  **208 characters and byte-identical to `EXPO_PUBLIC_SUPABASE_ANON_KEY`**, and a
  live `/auth/v1/health` call with that embedded key returns **200** — i.e. the
  "Invalid API key" failure mode is absent from this deployment.

## Future deploys

Two options:

1. **From this machine (works today):** the `wrangler login` session is stored
   locally; re-run the export + `pages deploy` command above.
2. **From GitHub Actions (needs one secret):** `.github/workflows/cloudflare-pages-deploy.yml`
   is committed and manual-only. It needs `CLOUDFLARE_API_TOKEN` (Cloudflare →
   My Profile → API Tokens → Create Token, template "Edit Cloudflare Workers").
   `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_PROJECT` are already stored as
   repository secrets.

## Custom domain (optional)

Pages → `rainbowclinic` → **Custom domains → Set up a domain**, enter e.g.
`app.rainbowchildclinic.com`. If the DNS zone is on Cloudflare the CNAME is added
automatically; otherwise add the CNAME it shows at your DNS provider. TLS is
issued automatically and free.

## Still out of scope here

The clinician dashboard needs the tRPC server hosted separately; the static site
serves the parent experience only. See `docs/KNOWN_GAPS_AND_DECISIONS.md`.

## Blank-page incident and fixes (2026-09-16)

The first deploys rendered a blank page. Diagnosed with a headless browser
(Playwright) capturing page errors, then fixed:

| Symptom | Root cause | Fix |
|---|---|---|
| `#root` empty, `Error: Couldn't find a LinkingContext context.` | **Two copies of `@react-navigation/native`** installed — a top-level 7.1.8 (pinned by an earlier `expo install --fix`) alongside expo-router's own 7.1.25. Two React Navigation instances cannot share the linking context, so the root Stack threw on first render. | Direct dependencies aligned to the versions expo-router resolves (`@react-navigation/native@7.1.25`, `@react-navigation/bottom-tabs@7.8.12`) → a single instance. |
| `localhost:3000` baked into the published bundle | `EXPO_PUBLIC_API_BASE_URL` (a developer-machine value) was inlined at build time, so every deployed visitor called their own machine. | `getApiBaseUrl()` now ignores a dev-machine base when the page itself is not localhost. |
| Deep links landed on onboarding | `unstable_settings.anchor = "index"` made the root gate the anchor for every deep link; `/report-acknowledgement?token=…` booted the gate and was redirected. | Anchor restored to `"(tabs)"`. |
| Every path served the root shell | Cloudflare serves a route's HTML only at a directory index. | `scripts/expand-static-routes.mjs` copies each `route.html` to `route/index.html`; wired into `pnpm deploy:web`. |
| Console `NetworkError` on every route | The app called tRPC/`apiCall` endpoints that do not exist on a static host. | Both clients short-circuit with an offline response when no API base is configured; screens use their built-in defaults. |

Verification after the fixes (headless browser, live URL):

- `/` → onboarding screen; `/parent-auth` → sign-in screen (Nepali password label present); `/booking` → booking flow
- No fatal page errors on any route; all image/font/JS assets return 200
- Known residue: a React hydration warning (#418, prerendered dates differ from client) and a stackless react-native-web `NetworkError` message in the console — both non-fatal, neither affects rendering.

## Deploy command (current)

```bash
pnpm deploy:web          # expo export + expand static routes
npx wrangler pages deploy dist --project-name=rainbowclinic --branch=main
```

## Password-reset and sign-up email links (2026-09-17)

Symptom reported: a password-reset email arrived, but the link opened
"app.rainbowchildclinic.com — DNS_PROBE_FINISHED_NXDOMAIN", and new parents could
not sign in because their confirmation link was also unreachable.

Root cause: **Supabase Auth's Site URL is set to `app.rainbowchildclinic.com`**,
a domain that does not resolve. Supabase sends confirmation and recovery links to
that host whenever the requested redirect target is not in its allow-list — so
every such email pointed at a dead domain, and unconfirmed accounts can never
sign in.

Fixed in the app (committed):

- `lib/supabase-auth.ts` now sends an explicit `emailRedirectTo` on sign-up and an
  explicit `redirectTo` on password reset, both computed from the running app
  origin, and maps Supabase errors to parent-readable copy (unconfirmed email,
  wrong credentials, rate limit, weak password).
- New `app/reset-password.tsx`: recovery links now land on a screen that lets the
  parent set a new password (and offers a fresh link when one has expired).

**Still required in the Supabase dashboard** (Auth → URL Configuration) — the
allow-list cannot be changed from the app:

1. **Site URL** → `https://rainbowclinic.pages.dev`
2. **Redirect URLs** → add `https://rainbowclinic.pages.dev/**` and `https://rainbowclinic.pages.dev/reset-password`
   (add `http://localhost:8081/**` if you also test locally)

After that, confirmation and reset emails open the live app. The alternative is
to make `app.rainbowchildclinic.com` real: add it as a custom domain on the
Cloudflare Pages project and point its DNS at Pages, which makes the existing
Site URL valid.

## Supabase auth URL configuration — applied 2026-09-17

The email-link failure was confirmed at the source using the Management API:

| Setting | Before | After |
|---|---|---|
| `site_url` | `https://app.rainbowchildclinic.com` (does not resolve) | `https://rainbowclinic.pages.dev` |
| `uri_allow_list` | *(empty)* — so every requested redirect fell back to the dead Site URL | `https://rainbowclinic.pages.dev/**,https://rainbowclinic.pages.dev/reset-password,http://localhost:8081/**` |
| `mailer_autoconfirm` | `false` (confirmation email required) | `true` (sign-up signs the parent in immediately) |

Verified live afterwards: a brand-new account signs up (`/auth/v1/signup → 200`) and lands
inside the app, and the reset screen is reachable at `/reset-password`.

### Why confirmation was turned off, and how to revert

The clinic's privacy model does not depend on a confirmed email address: a guardian sees a
child only after the clinic links their account (`guardians` row) and RLS scopes every read
through that link. With the dead domain and an empty allow-list, confirmation emails could
not be delivered at all, so no parent could finish signing up.

To require confirmation again (e.g. once `app.rainbowchildclinic.com` is a real domain),
set `mailer_autoconfirm` back to `false` and keep the Site URL and allow-list as above.
