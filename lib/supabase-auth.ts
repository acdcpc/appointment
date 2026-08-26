/**
 * Guardian authentication — Supabase Auth, EMAIL + PASSWORD (production path).
 *
 * Decision (2026-08-26): the clinic runs WITHOUT any paid SMS provider.
 * Production sign-in for parents is email + password with email confirmation,
 * backed by Supabase Auth and the `public.guardians` RLS linkage (migration
 * 0003). No Twilio/SMS configuration or credentials are required anywhere.
 *
 * Extensibility: this module is deliberately provider-neutral. If phone OTP
 * is approved later, add `requestGuardianPhoneOtp(phone)` /
 * `verifyGuardianPhoneOtp(phone, token)` here (one-line `signInWithOtp` calls
 * through the same getSupabase() seam) — screens and routers do not change.
 */
import { getSupabase } from "@/lib/supabase";

export const normalizeGuardianEmail = (email: string) => email.trim().toLowerCase();

export type GuardianSession = {
  userId: string;
  email: string | null;
  phone: string | null; // reserved for the future phone-OTP path; always null today
};

/** Sign in an existing guardian account with email + password. */
export async function signInGuardianWithEmail(email: string, password: string): Promise<GuardianSession> {
  const client = getSupabase();
  if (!client) {
    throw new Error(
      "Supabase is not configured on this build. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  const normalized = normalizeGuardianEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  const { data, error } = await client.auth.signInWithPassword({ email: normalized, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Sign-in succeeded but no session could be started. Please try again.");
  return { userId: data.user.id, email: data.user.email ?? normalized, phone: null };
}

/**
 * Create a guardian account. With email confirmations enabled, the user is
 * created but must confirm their inbox before the first sign-in.
 */
export async function signUpGuardianWithEmail(email: string, password: string): Promise<{
  email: string;
  needsEmailConfirmation: boolean;
}> {
  const client = getSupabase();
  if (!client) {
    throw new Error(
      "Supabase is not configured on this build. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  const normalized = normalizeGuardianEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  const { data, error } = await client.auth.signUp({ email: normalized, password });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already registered") || message.includes("already been registered")) {
      throw new Error("An account with this email already exists. Sign in instead.");
    }
    throw new Error(error.message);
  }
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error("An account with this email already exists. Sign in instead.");
  }
  return {
    email: normalized,
    needsEmailConfirmation: Boolean(data.user && !data.session),
  };
}

/** Current guardian session (null when signed out). */
export async function getGuardianSession(): Promise<GuardianSession | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) return null;
  return {
    userId: data.session.user.id,
    email: data.session.user.email ?? null,
    phone: null,
  };
}

export async function signOutGuardian() {
  const client = getSupabase();
  if (!client) return;
  await client.auth.signOut();
}
