import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * App-side Supabase client (anon key only — never put the service-role key
 * in client code). Reads EXPO_PUBLIC_* env vars so it works on web, Android,
 * and iOS (Expo inlines these at build time).
 *
 * The app still uses its existing OAuth flow for the clinician dashboard;
 * Supabase Auth + this client become the patient-facing identity layer.
 * When env vars are absent the client returns null and all existing
 * sample-data flows keep working unchanged.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn(
        "[Supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY not set — running without Supabase."
      );
    }
    return null;
  }
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _client;
}

export async function getSupabaseSession() {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  return error ? null : data.session;
}

export async function signInWithSupabaseEmail(email: string, password: string) {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithSupabaseEmail(email: string, password: string) {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutSupabase() {
  const client = getSupabase();
  if (!client) return;
  await client.auth.signOut();
}
