/**
 * End-to-end check that a booking request stores the child's date of birth.
 *
 * Inserts the same row shape the booking screen sends (English + Bikram Sambat
 * date texts), reads it back through the app's own mapping, and removes it.
 *
 * Run: pnpm exec tsx scripts/verify-booking-dob.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (see .env)");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  // The table's rows belong to the guardian who asked; a service-role insert
  // has no auth.uid(), so a real account id is used explicitly here.
  const { data: users, error: usersError } = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (usersError || !users?.users?.length) {
    console.error("No auth user available to attach the verification rows to:", usersError?.message);
    process.exit(1);
  }
  const ownerId = users.users[0].id;

  const results: Array<[string, boolean, string]> = [];
  const check = (name: string, ok: boolean, detail = "") => {
    results.push([name, ok, detail]);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  };

  let id: number | null = null;
  try {
    const { data: inserted, error: insertError } = await db
      .from("booking_requests")
      .insert({
        auth_user_id: ownerId,
        child_name: "Verification Child",
        child_age: "4 years 2 months",
        child_sex: "male",
        child_dob: "14 May 2022",
        child_dob_bs: "31 Baisakh 2079",
        guardian_phone: "9800000000",
        service: "Pediatric consultation",
        preferred_date: "Tue, Sep 30",
        preferred_time: "6:00 PM",
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);
    id = inserted!.id;
    check("a request with an English + Bikram Sambat date of birth is stored", true, `row ${id}`);

    const { data: row, error: readError } = await db
      .from("booking_requests")
      .select("child_dob, child_dob_bs")
      .eq("id", id)
      .single();
    if (readError) throw new Error(readError.message);
    check("the English date comes back unchanged", row?.child_dob === "14 May 2022", String(row?.child_dob));
    check("the Bikram Sambat date comes back unchanged", row?.child_dob_bs === "31 Baisakh 2079", String(row?.child_dob_bs));

    const { data: plain, error: plainError } = await db
      .from("booking_requests")
      .insert({
        auth_user_id: ownerId,
        child_name: "Verification Child No DOB",
        child_age: "2 years 0 months",
        child_sex: "female",
        guardian_phone: "9800000001",
        service: "Pediatric consultation",
        preferred_date: "Tue, Sep 30",
        preferred_time: "6:30 PM",
      })
      .select("id, child_dob")
      .single();
    if (plainError) throw new Error(plainError.message);
    check("a request without a date of birth stores null, not an empty string", plain?.child_dob === null, String(plain?.child_dob));
    await db.from("booking_requests").delete().eq("id", plain!.id);
  } catch (error) {
    check("verification run", false, error instanceof Error ? error.message : String(error));
  } finally {
    if (id !== null) await db.from("booking_requests").delete().eq("id", id);
    const { count } = await db.from("booking_requests").select("id", { count: "exact", head: true }).eq("id", id ?? -1);
    check("verification rows removed", (count ?? 0) === 0, "cleanup done");
  }

  const failed = results.filter(([, ok]) => !ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

void main();
