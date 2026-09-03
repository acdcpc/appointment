import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getSupabaseAdmin } from "../supabase";
import { isClinicAdministratorEmail } from "../clinic-authority";

/**
 * Secondary auth path: Supabase access tokens (email + password sessions).
 * Verifies the JWT with Supabase, then only elevates clinic-administrator
 * emails so admin procedures keep their server-side authority check.
 */
async function supabaseTokenUser(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  const admin = getSupabaseAdmin();
  if (!admin || !token) return null;
  const { data } = await admin.auth.getUser(token);
  const email = data?.user?.email ?? null;
  if (!email || !isClinicAdministratorEmail(email)) return null;
  const { data: rows } = await admin.from("users").select("*").eq("email", email).limit(1);
  const row = rows?.[0];
  return row ? (row as unknown as User) : null;
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }
  if (!user) {
    try {
      user = await supabaseTokenUser(opts.req);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
