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
  const origin = appOrigin();
  const { data, error } = await client.auth.signUp({
    email: normalized,
    password,
    ...(origin ? { options: { emailRedirectTo: `${origin}/parent-auth` } } : {}),
  });
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

/** Where Supabase should send email links back to (the running app origin). */
export function appOrigin(): string {
  try {
    if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  } catch { /* non-web */ }
  return "";
}

/** Turn Supabase's raw auth errors into copy a parent can act on. */
export function friendlyAuthError(error: { message?: string } | null | undefined): string {
  const raw = (error?.message ?? "").trim();
  const m = raw.toLowerCase();
  if (m.includes("email not confirmed")) return "Your email is not confirmed yet. Open the confirmation link we emailed you, then sign in.";
  if (m.includes("invalid login credentials")) return "That email and password do not match an account. Check both, or create an account.";
  if (m.includes("invalid api key")) return "The app configuration is out of date. Please restart the app and try again.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts just now. Please wait a minute and try again.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists. Sign in instead.";
  if (m.includes("password should be")) return "Choose a longer password (at least 6 characters).";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "Enter a valid email address.";
  return raw || "Something went wrong. Please try again.";
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

/** Send a password-reset email. The link returns to this app's /reset-password screen. */
export async function sendGuardianPasswordReset(email: string): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured on this build.");
  const normalized = normalizeGuardianEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) throw new Error("Enter a valid email address.");
  const origin = appOrigin();
  const { error } = await client.auth.resetPasswordForEmail(normalized, origin ? { redirectTo: `${origin}/reset-password` } : undefined);
  if (error) throw new Error(friendlyAuthError(error));
}

/** Set a new password for the session created by a recovery link. */
export async function updateGuardianPassword(password: string): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured on this build.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error(friendlyAuthError(error));
}

/** Re-send the sign-up confirmation email (Kapoori-style "resend verification"). */
export async function resendGuardianVerificationEmail(email: string): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured on this build.");
  const normalized = normalizeGuardianEmail(email);
  const origin = appOrigin();
  const { error } = await client.auth.resend({
    type: "signup",
    email: normalized,
    ...(origin ? { options: { emailRedirectTo: `${origin}/parent-auth` } } : {}),
  });
  if (error) throw new Error(friendlyAuthError(error));
}
