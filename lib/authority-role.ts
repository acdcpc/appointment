import { useEffect, useState } from "react";

import { getSupabaseSession } from "./supabase";
import { isClinicAdministratorEmail, isSuperAdminEmail } from "../server/clinic-authority";

/**
 * Which clinic authority, if any, is signed in.
 *
 * The parent app and the clinic dashboard are different jobs: a clinic admin or
 * the super-admin does not book their own child in, so the parent tabs are
 * noise for them. Screens use this hook to show the right shell.
 */
export type AuthorityRole = "loading" | "guardian" | "clinic-admin" | "super-admin";

export function useAuthorityRole(): AuthorityRole {
  const [role, setRole] = useState<AuthorityRole>("loading");

  useEffect(() => {
    let cancelled = false;
    getSupabaseSession()
      .then((session) => {
        if (cancelled) return;
        const email = session?.user?.email ?? "";
        if (isSuperAdminEmail(email)) setRole("super-admin");
        else if (isClinicAdministratorEmail(email)) setRole("clinic-admin");
        else setRole("guardian");
      })
      .catch(() => { if (!cancelled) setRole("guardian"); });
    return () => { cancelled = true; };
  }, []);

  return role;
}

export function isAuthorityRole(role: AuthorityRole): boolean {
  return role === "clinic-admin" || role === "super-admin";
}
