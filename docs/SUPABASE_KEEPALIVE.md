# Supabase Keep-Alive

Free-tier Supabase projects are **paused after ~7 days without API activity**.
This repo ships a daily ping so the project stays awake.

## How it works

- `scripts/keep-supabase-alive.mjs` — one minimal read against the project
  (REST row read + auth health check). Uses the **public anon key** only; the
  service-role key is never needed or stored here.
- `.github/workflows/supabase-keepalive.yml` — GitHub Actions schedule at
  `03:00 UTC` (08:45 NPT) daily. Runs on GitHub's servers, so it works even
  when no local machine is on. A manual `workflow_dispatch` run is also
  available from the Actions tab.

## One-time setup (required for the workflow)

1. Repo → Settings → Secrets and variables → Actions → New repository secret:
   - `SUPABASE_URL` = `https://bpocsorqstqfessdclfh.supabase.co`
   - `SUPABASE_ANON_KEY` = the public anon key from
     Supabase Dashboard → Project Settings → API (the `anon` `publishable` key)
2. Open the **supabase-keepalive** workflow in the Actions tab and click
   **Run workflow** once to confirm it succeeds.
3. From then on it fires daily. Check the Actions tab for the run log.

## Local alternative

```bash
node scripts/keep-supabase-alive.mjs   # reads .env (SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)
```

## Caveats

- GitHub **disables scheduled workflows after 60 days without repo activity**.
  If the workflow stops running, trigger it manually once (Actions tab →
  Run workflow) or make any commit — the schedule resumes.
- The schedule alone does not consume meaningful Actions minutes (~10 s/day).
- The repo `.env` is gitignored; the workflow uses repository secrets instead.
