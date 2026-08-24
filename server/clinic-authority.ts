export const SUPER_ADMIN_EMAIL = "thisispratha@gmail.com";
export const CLINIC_ADMIN_EMAIL = "anilrajojha@pahs.edu.np";

export function normalizeAuthorityEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function isSuperAdminEmail(value: string | null | undefined) {
  return normalizeAuthorityEmail(value) === SUPER_ADMIN_EMAIL;
}

export function isClinicAdministratorEmail(value: string | null | undefined) {
  const email = normalizeAuthorityEmail(value);
  return email === SUPER_ADMIN_EMAIL || email === CLINIC_ADMIN_EMAIL;
}

export function clinicAuthorityLabel(value: string | null | undefined) {
  if (isSuperAdminEmail(value)) return "super-admin" as const;
  if (normalizeAuthorityEmail(value) === CLINIC_ADMIN_EMAIL) return "clinic-admin" as const;
  return "none" as const;
}
