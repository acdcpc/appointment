#!/usr/bin/env node
/**
 * Keep the Supabase free-tier project from pausing.
 *
 * A free Supabase project is paused after ~7 days with no API activity.
 * This script issues a minimal authenticated request (one row read) so the
 * project counts as active. It is dependency-free (Node >= 18 fetch).
 *
 * Usage:
 *   node scripts/keep-supabase-alive.mjs            # reads SUPABASE_URL/SUPABASE_ANON_KEY from env or .env
 *
 * Env (falling back to .env via dotenv):
 *   SUPABASE_URL         e.g. https://bpocsorqstqfessdclfh.supabase.co
 *   SUPABASE_ANON_KEY    the public anon key (safe for clients; never the service-role key)
 */
import { readFileSync } from "node:fs";

// Minimal .env loader (no dependencies; CI passes real env vars instead).
try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* no .env in CI */ }

const url = (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (!url || !key) {
  console.error("keepalive: missing SUPABASE_URL or SUPABASE_ANON_KEY (set env or .env)");
  process.exit(1);
}

const targets = [
  { name: "rest", path: "/rest/v1/clinic_public_settings?select=id&limit=1" },
  { name: "auth", path: "/auth/v1/health" },
];

let ok = 0;
for (const t of targets) {
  try {
    const res = await fetch(`${url}${t.path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    const good = res.ok;
    console.log(`keepalive: ${t.name} -> ${res.status} ${good ? "OK" : "FAIL"}`);
    if (good) ok++;
  } catch (err) {
    console.error(`keepalive: ${t.name} -> error: ${err.message}`);
  }
}

if (ok === 0) {
  console.error("keepalive: no endpoint reachable — project may be paused or env wrong");
  process.exit(1);
}
console.log("keepalive: supabase is awake");
