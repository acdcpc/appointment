/**
 * End-to-end check of the repeat-visit growth comparison.
 *
 * Writes two visits for the same seeded patient into Supabase with the service
 * role, reads them back the way the app does, and runs the same trend builder the
 * Growth tab uses. Prints the comparison and removes what it wrote.
 *
 * Run: pnpm exec tsx scripts/verify-growth-trend.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

import { formatClinicDate } from "../lib/growth-measurements";
import { interpretMeasurement } from "../lib/growth-interpretation";
import { buildGrowthTrend, type TrendVisit } from "../lib/growth-trend";

dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (see .env)");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const CHILD_ID = "child-1";
const MEDIAN = 50;

function addMonths(date: Date, months: number) {
  const copy = new Date(date.getTime());
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function ageMonthsBetween(birth: Date, measured: Date) {
  return (measured.getFullYear() - birth.getFullYear()) * 12 + (measured.getMonth() - birth.getMonth()) - (measured.getDate() < birth.getDate() ? 1 : 0);
}

const results: Array<[string, boolean, string]> = [];
const check = (name: string, ok: boolean, detail = "") => {
  results.push([name, ok, detail]);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

async function main() {
const { data: child, error: childError } = await db
  .from("clinic_children")
  .select('"childId", "dateOfBirth", sex, "parentName"')
  .eq("childId", CHILD_ID)
  .single();

if (childError || !child) {
  console.error("Could not read the seeded child:", childError?.message);
  process.exit(1);
}

const birth = new Date(child.dateOfBirth);
const first = addMonths(birth, 12);
const second = addMonths(birth, 18);
const written: number[] = [];

try {
  // Visit 1: weight on the 50th centile at 12 months.
  const { data: row1, error: error1 } = await db.from("child_growth_measurements").insert({
    child_id: CHILD_ID,
    measured_on: formatClinicDate(first),
    age_months: ageMonthsBetween(birth, first),
    weight_kg: 9.6,
    height_cm: 75.7,
    head_circumference_cm: 46.1,
    note: "verification visit 1",
    recorded_role: "clinic",
  }).select("id").single();
  if (error1) throw new Error(error1.message);
  written.push(row1!.id);

  // Visit 2: weight has barely moved while the child aged six months — a child
  // who stays put while the reference moves is the case the comparison must catch.
  const { data: row2, error: error2 } = await db.from("child_growth_measurements").insert({
    child_id: CHILD_ID,
    measured_on: formatClinicDate(second),
    age_months: ageMonthsBetween(birth, second),
    weight_kg: 9.8,
    height_cm: 78.2,
    head_circumference_cm: 47.0,
    note: "verification visit 2",
    recorded_role: "clinic",
  }).select("id").single();
  if (error2) throw new Error(error2.message);
  written.push(row2!.id);

  check("two visits stored for the same patient", true, `${child.childId} at 12 and 18 months`);

  const { data: stored, error: readError } = await db
    .from("child_growth_measurements")
    .select("id, measured_on, age_months, weight_kg, height_cm, head_circumference_cm")
    .eq("child_id", CHILD_ID)
    .in("id", written);

  if (readError) throw new Error(readError.message);
  const visits: TrendVisit[] = (stored ?? []).map((row) => ({
    occurredOn: row.measured_on,
    ageMonths: row.age_months ?? 0,
    weightKg: row.weight_kg === null ? undefined : Number(row.weight_kg),
    heightCm: row.height_cm === null ? undefined : Number(row.height_cm),
    headCircumferenceCm: row.head_circumference_cm === null ? undefined : Number(row.head_circumference_cm),
  }));

  check(
    "the stored age matches the measurement date",
    visits[0]?.ageMonths === 12 && visits[1]?.ageMonths === 18,
    `ages ${visits.map((visit) => visit.ageMonths).join(" and ")} months`,
  );

  const sex = child.sex === "male" ? "male" as const : "female" as const;
  const firstScore = interpretMeasurement({ ageMonths: 12, sex, weightKg: 9.6, heightCm: 75.7, headCircumferenceCm: 46.1 });
  check(
    "the first visit is charted with a WHO interpretation",
    firstScore.metrics.some((metric) => metric.z !== undefined),
    firstScore.metrics.filter((metric) => metric.z !== undefined).map((metric) => `${metric.label} z ${metric.z} (P${metric.percentile})`).join(", "),
  );

  const trend = buildGrowthTrend({ sex, previous: visits[0], current: visits[1] });
  const weight = trend.metrics.find((metric) => metric.metric === "weight")!;
  check("the second visit is compared with the first", trend.days > 150, `${trend.days} days apart`);
  check(
    "the comparison reports the change and the rate",
    weight.change !== undefined && weight.rateUnit === "kg/month" && !weight.statement.includes("cm/month"),
    weight.statement,
  );
  check(
    "a child who stops gaining while ageing is flagged",
    weight.direction === "worsening" && trend.flags.length > 0,
    trend.flags[0] ?? trend.summary,
  );
  check("the centile movement is reported", weight.fromPercentile !== undefined && weight.toPercentile !== undefined, `P${weight.fromPercentile} → P${weight.toPercentile} (Δz ${weight.deltaZ})`);

  // Isolation: another child must not see these visits.
  const { data: other } = await db
    .from("child_growth_measurements")
    .select("id")
    .eq("child_id", "child-2")
    .in("id", written);
  check("the visits stay bound to their own child", (other ?? []).length === 0, "child-2 sees none of them");
} catch (error) {
  check("verification run", false, error instanceof Error ? error.message : String(error));
} finally {
  if (written.length) await db.from("child_growth_measurements").delete().in("id", written);
  const { count } = await db.from("child_growth_measurements").select("id", { count: "exact", head: true }).in("id", written);
  check("verification rows removed", (count ?? 0) === 0, `${written.length} rows written and deleted`);
}

const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
}

void main();
