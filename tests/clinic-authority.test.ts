import { describe, expect, it } from "vitest";
import { CLINIC_ADMIN_EMAIL, SUPER_ADMIN_EMAIL, clinicAuthorityLabel, isClinicAdministratorEmail, isSuperAdminEmail } from "../server/clinic-authority";

describe("trusted clinic authority emails", () => {
  it("recognizes only the configured super-admin as super-admin", () => {
    expect(isSuperAdminEmail(" ThisIsPratha@GMAIL.COM ")).toBe(true);
    expect(isSuperAdminEmail(CLINIC_ADMIN_EMAIL)).toBe(false);
  });
  it("recognizes the designated clinic administrator without granting super-admin authority", () => {
    expect(isClinicAdministratorEmail("ANILRAJOJHA@PAHS.EDU.NP")).toBe(true);
    expect(clinicAuthorityLabel(CLINIC_ADMIN_EMAIL)).toBe("clinic-admin");
  });
  it("rejects any other email from trusted clinic administration", () => {
    expect(isClinicAdministratorEmail("other@example.com")).toBe(false);
    expect(clinicAuthorityLabel(SUPER_ADMIN_EMAIL)).toBe("super-admin");
  });
});
