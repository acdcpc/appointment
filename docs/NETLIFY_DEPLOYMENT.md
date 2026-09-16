# Netlify deployment (web)

The web app is a static export built with `npx expo export --platform web`,
which writes to `dist/`. **`dist/` is gitignored**, so Netlify must build it
itself. `netlify.toml` in the repo already sets this up:

- build command: `npx expo export --platform web`
- publish directory: `dist`
- Node 22
- SPA fallback (`/*` → `/index.html` 200) so client routes never 404

## Required environment variables

Set these in Netlify → Site settings → Environment variables (same values as
`.env`, they are inlined into the web bundle at build time):

| Name | Value |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://bpocsorqstqfessdclfh.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | the anon/publishable key (Supabase → Project Settings → API) |

Without these the app builds but Supabase auth/data calls have no backend URL.

## Option A — connected repo (recommended)

1. Netlify → Add new site → Import an existing project → pick the
   `acdcpc/appointment` GitHub repo.
2. Netlify auto-reads `netlify.toml`; verify Build command / Publish directory
   are as above (it may show them automatically).
3. Add the two environment variables above.
4. Deploy. Every push to `main` redeploys automatically.

## Option B — manual upload (existing site `bright-treacle-c89577`)

If the site was created by dragging a folder, it has **no build pipeline** and
ignores `netlify.toml`. Then the 404 is expected: the uploaded folder had no
`index.html` at its root.

Fix: either connect the GitHub repo (Option A) to the same site
(Site settings → Build & deploy → Linked repository), or locally build and
upload the correct folder:

```bash
pnpm exec expo export --platform web   # produces dist/
```

then drag the **contents of `dist/`** (it contains `index.html`) onto
Netlify's manual deploy, or `npx netlify deploy --prod --dir dist`.

## Verify

Open the site root — the Rainbow Child Development Clinic home should render.
Routes like `/parent-auth` are client-side; the SPA fallback serves the app
shell for them.

## Current status (checked 2026-09-15)

- The site URL <https://bright-treacle-c89577.netlify.app> answers **HTTP 404 "Not Found"** → **no published deploy exists yet**. Nothing is broken in the build; the publish step has simply never completed.
- `netlify.toml` is correct: build command (with the NativeWind cache bootstrap), publish dir `dist`, Node 22, SPA fallback.
- The build is proven: a cold `pnpm install` → bootstrap → `expo export --platform web` produces `dist/index.html` containing the clinic app.
- `public/_redirects` (`/* /index.html 200`) is now committed, so the SPA fallback also works for the manual-upload path where `netlify.toml` is not present.

## Option A — link the repository (recommended; auto-deploys on every push)

1. Open <https://app.netlify.com> → select the site (`bright-treacle-c89577`).
2. **Site configuration → Build & deploy → Link repository** → GitHub → authorize → pick `acdcpc/appointment`, branch `main`.
3. Before the first build, add the two environment variables (Site configuration → Environment variables):
   - `EXPO_PUBLIC_SUPABASE_URL` = `https://bpocsorqstqfessdclfh.supabase.co`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = the anon/publishable key (Supabase → Project Settings → API, or `.env` line `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploys → **Trigger deploy → Deploy site** (linking usually triggers it).
5. Success looks like: Deploys list shows **Published**, and the site URL renders the clinic app.

If the variables were added *after* a build, redeploy once with **Clear cache and deploy site** so the new values are inlined into the bundle.

## Option B — manual upload (fastest, no repository link)

1. Build locally: `pnpm install && npx expo export --platform web` (produces `dist/`).
2. Netlify → the site → **Deploys → Deploy manually**, then drag the **contents of `dist/`** (it contains `index.html` and `_redirects`).
3. Manual deploys do not rebuild on push — re-drag after changes.

## Verify a deploy (any machine)

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://bright-treacle-c89577.netlify.app/   # expect 200
curl -s https://bright-treacle-c89577.netlify.app/ | grep -c "Rainbow Child Development Clinic"  # expect 1+
```

Note: parent flows are fully static-capable; the **clinician dashboard needs the tRPC server**, which is a separate hosting task (see `docs/KNOWN_GAPS_AND_DECISIONS.md`).

## When Netlify skips builds: "account credit usage exceeded"

Observed 2026-09-15: the site's deploys show **Skipped** because the account's
included **build minutes/credits are exhausted**. Netlify stops running builds
when that happens; the last published deploy keeps being served, but no new
build is started until the allowance resets (start of the billing month) or the
plan is upgraded.

Important distinction:

| Action | Consumes Netlify build minutes? | Works while credits are exhausted? |
|---|---|---|
| Netlify builds from the repository (`netlify.toml`) | **Yes** | No — builds are skipped |
| Deploying prebuilt files via CLI/API (`netlify deploy --prod --dir dist`) | **No** — it is an upload, not a build | **Yes** |

So the credit limit does not block publishing: build in GitHub Actions (free on
public repositories, 2000 minutes/month on private) and let Netlify only host.
That is exactly what `.github/workflows/netlify-deploy.yml` does — see the
"manual fallback" section above for the two secrets it needs.

Longer term, if Netlify's build allowance keeps being the bottleneck, the same
`dist/` folder can be served by any root-hosted static host (Cloudflare Pages,
for example) with no change to the export, because the app is built to be served
from the site root.

### Correction (verified 2026-09-16): the credit lock blocks uploads too

An earlier note in this file said CLI/API uploads still work while build credits
are exhausted. **That is wrong for Netlify's current credit model**, and it was
verified against the live account:

| Evidence | Result |
|---|---|
| `netlify api getSite --data '{"site_id":"ecc8b151-…"}'` | **Succeeds** — site `rainbowclinic`, account `prakashthapa-paed`, with an existing published deploy |
| `netlify deploy --prod --dir dist` (linked site) | **`JSONHTTPError: Forbidden`** |
| `netlify api createSiteDeploy` (raw deploy create) | **`JSONHTTPError: Forbidden`** |

Reads succeed with the same token while every write is refused, so this is an
**account-level deploy block caused by exhausted credits**, not a token-scope
problem. While the account is in that state, *no* deploy route works on Netlify —
not repository builds and not CLI/API uploads.

Consequences:

1. Publishing on this Netlify account requires either the credit reset (start of
   the billing cycle) or adding a payment method / upgrading.
2. A second Netlify account would work, but starts the same metre over again.
3. A different static host is not affected by the Netlify lock: build here, upload
   there (see `.github/workflows/cloudflare-pages-deploy.yml`).
4. The currently published deploy is still served, so turning off visitor access
   makes the *existing* (older) build usable immediately without any new deploy.
