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
