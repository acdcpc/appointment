import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

/**
 * Server-side Supabase admin client. Uses the service-role key, which must
 * live only in server environment variables (never in client code or git).
 * Falls back to the anon key + URL when only the public values are present,
 * so local dev keeps working without a configured project.
 */

const supabaseUrl = ENV.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = ENV.supabaseServiceRoleKey || "";

let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("[Supabase] Server credentials not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
    return null;
  }
  if (!_admin) {
    _admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}

/** Test connectivity; returns a plain status object for health checks. */
export async function checkSupabaseConnection() {
  const client = getSupabaseAdmin();
  if (!client) return { configured: false };
  const { error } = await client.from("clinic_public_settings").select("id").limit(1);
  return { configured: true, reachable: !error, error: error?.message ?? null };
}
