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
