/**
 * Guardian phone/OTP authentication — Supabase Auth (primary backend).
 *
 * These functions exercise the REAL Supabase phone-OTP flow via the anon
 * client. They do NOT fabricate success: an unconfigured SMS provider (or an
 * unconfigured Supabase project) surfaces a clear bilingual error instead of
 * a demo state.
 *
 * Server-side requirements (see docs/SUPABASE_MIGRATION_PLAN.md):
 *  - Supabase project "appointment": phone provider enabled (Twilio).
 *  - RLS: `public.guardians` links a Supabase auth user to a child; guardian
 *    read policies on clinic tables are already shipped in migration 0003.
 */
import { getSupabase } from "@/lib/supabase";

const normalizePhone = (value: string) => value.replace(/[\s-]/g, "");

/** Step 1: request a one-time SMS code for a phone number. */
export async function requestGuardianOtp(phone: string): Promise<{ sentTo: string }> {
  const client = getSupabase();
  if (!client) {
    throw new Error(
      "Supabase is not configured on this build, so no SMS can be requested. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  const normalized = normalizePhone(phone);
  if (!/^\+?[1-9][0-9]{6,17}$/.test(normalized)) {
    throw new Error("Enter a valid phone number with country code, e.g. +977 98XXXXXXXX.");
  }
  const { error } = await client.auth.signInWithOtp({ phone: normalized });
  if (error) {
    // Provider not enabled / missing SMS credentials surfaces as an error —
    // never a fake success.
    throw new Error(error.message);
  }
  return { sentTo: normalized };
}

/** Step 2: verify the six-digit code and start a Supabase session. */
export async function verifyGuardianOtp(phone: string, token: string): Promise<{ userId: string; phone: string }> {
  const client = getSupabase();
  if (!client) {
    throw new Error("Supabase is not configured on this build, so the code cannot be verified.");
  }
  const normalized = normalizePhone(phone);
  const { data, error } = await client.auth.verifyOtp({
    phone: normalized,
    token: token.trim(),
    type: "sms",
  });
  if (error) throw new Error(error.message);
  const user = data.user;
  if (!user) throw new Error("The code was accepted but no session could be started. Please try again.");
  return { userId: user.id, phone: user.phone ?? normalized };
}

/** Current guardian session (null when signed out). */
export async function getGuardianSession() {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) return null;
  return {
    userId: data.session.user.id,
    phone: data.session.user.phone ?? null,
    email: data.session.user.email ?? null,
  };
}

export async function signOutGuardian() {
  const client = getSupabase();
  if (!client) return;
  await client.auth.signOut();
}
