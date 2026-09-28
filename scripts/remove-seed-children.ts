/**
 * One-off cleanup: remove the three prototype seed children from Supabase.
 *
 * The owner asked for them to be gone now that real use begins. Archives every
 * row it is about to delete into docs/archive/ before deleting, per the
 * project's traceability rule, then verifies the tables are empty of them.
 *
 * Run: pnpm exec tsx scripts/remove-seed-children.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";

dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (see .env)");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const SEED_IDS = ["child-1", "child-2", "child-3"];

async function main() {
  // 1) Snapshot everything about to be removed.
  const { data: allChildren, error: childrenError } = await db.from("clinic_children").select("*");
  if (childrenError) throw new Error(childrenError.message);
  const seedChildren = (allChildren ?? []).filter((row) => SEED_IDS.includes(String(row.childId)));
  const extraChildren = (allChildren ?? []).filter((row) => !SEED_IDS.includes(String(row.childId)));

  console.log(`children in table: ${allChildren?.length ?? 0}`);
  for (const row of allChildren ?? []) console.log(`  - ${row.childId} · ${row.name}`);
  if (extraChildren.length) {
    console.log(`NOTE: ${extraChildren.length} non-seed child row(s) will NOT be touched.`);
  }

  const { data: guardianLinks } = await db.from("guardians").select("*").in("child_id", SEED_IDS);
  const { data: measurements } = await db
    .from("child_growth_measurements")
    .select("id, child_id, measured_on, age_months, weight_kg, height_cm, head_circumference_cm, note, recorded_role")
    .in("child_id", SEED_IDS);
  const { data: shares } = await db.from("patient_report_shares").select("*").in("childId", SEED_IDS).then((r) => r, () => ({ data: [] as Record<string, unknown>[] }));

  const archive = {
    removedAt: new Date().toISOString(),
    reason: "Owner request: the three prototype seed children must not remain as if they were real clinic records. App-side sample data was already removed from the build; this removes the database rows.",
    children: seedChildren,
    guardianLinks: guardianLinks ?? [],
    growthMeasurements: measurements ?? [],
    reportShares: shares ?? [],
  };
  mkdirSync("docs/archive", { recursive: true });
  const archivePath = "docs/archive/removed-seed-children-2026-09-28.json";
  writeFileSync(archivePath, JSON.stringify(archive, null, 2));
  console.log(`archived to ${archivePath}: ${seedChildren.length} children, ${guardianLinks?.length ?? 0} guardian links, ${measurements?.length ?? 0} measurements, ${shares?.length ?? 0} report shares`);

  // 2) Delete in dependency order (none of these tables carry FKs to each other,
  //    but removing children first isolates anything unexpected).
  const m = await db.from("child_growth_measurements").delete().in("child_id", SEED_IDS);
  if (m.error) throw new Error(`measurements: ${m.error.message}`);
  const g = await db.from("guardians").delete().in("child_id", SEED_IDS);
  if (g.error) throw new Error(`guardian links: ${g.error.message}`);
  if ((shares?.length ?? 0) > 0) {
    const s = await db.from("patient_report_shares").delete().in("childId", SEED_IDS);
    if (s.error) throw new Error(`report shares: ${s.error.message}`);
  }
  const c = await db.from("clinic_children").delete().in("childId", SEED_IDS);
  if (c.error) throw new Error(`children: ${c.error.message}`);

  // 3) Verify.
  const { data: remaining } = await db.from("clinic_children").select("childId, name");
  const { count: linkCount } = await db.from("guardians").select("*", { count: "exact", head: true });
  const { count: measurementCount } = await db.from("child_growth_measurements").select("id", { count: "exact", head: true });
  const seedLeft = (remaining ?? []).filter((row) => SEED_IDS.includes(String(row.childId)));

  console.log(`remaining children: ${remaining?.length ?? 0}${remaining?.length ? ` (${remaining.map((r) => r.name).join(", ")})` : ""}`);
  console.log(`remaining guardian links: ${linkCount ?? 0}`);
  console.log(`remaining growth measurements: ${measurementCount ?? 0}`);
  console.log(seedLeft.length === 0 ? "PASS  the three seed children are gone" : `FAIL  ${seedLeft.length} seed children still present`);
  process.exit(seedLeft.length === 0 ? 0 : 1);
}

void main();
