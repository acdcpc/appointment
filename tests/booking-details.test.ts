import { describe, expect, it } from "vitest";
import { composeAge, emptyBookingDetails, parseAgeParts, validateBookingDetails } from "../lib/booking-requests";

const valid = { ...emptyBookingDetails, childName: "Aarav Smith", childAgeYears: "4", childAgeMonths: "2", childSex: "male" as const, guardianPhone: "9812345678" };

describe("booking child details", () => {
  it("accepts a complete set of details", () => {
    expect(validateBookingDetails(valid).ok).toBe(true);
  });

  it("accepts a baby under one year given in months only", () => {
    expect(validateBookingDetails({ ...valid, childAgeYears: "0", childAgeMonths: "7" }).ok).toBe(true);
  });

  it("rejects a missing name, sex or contact number", () => {
    expect(validateBookingDetails({ ...valid, childName: "" }).ok).toBe(false);
    expect(validateBookingDetails({ ...valid, childSex: "" }).ok).toBe(false);
    expect(validateBookingDetails({ ...valid, guardianPhone: "12" }).ok).toBe(false);
  });

  it("rejects an age of zero years and zero months", () => {
    expect(validateBookingDetails({ ...valid, childAgeYears: "0", childAgeMonths: "0" }).ok).toBe(false);
  });

  it("rejects more than 11 months and a birth year typed as the age", () => {
    expect(validateBookingDetails({ ...valid, childAgeMonths: "14" }).ok).toBe(false);
    expect(validateBookingDetails({ ...valid, childAgeYears: "2022", childAgeMonths: "0" }).ok).toBe(false);
  });

  it("rejects a malformed email but allows an empty one", () => {
    expect(validateBookingDetails({ ...valid, guardianEmail: "not-an-email" }).ok).toBe(false);
    expect(validateBookingDetails({ ...valid, guardianEmail: "" }).ok).toBe(true);
  });

  it("composes and parses the age text round-trip", () => {
    expect(composeAge(4, 2)).toBe("4 years 2 months");
    expect(composeAge(1, 1)).toBe("1 year 1 month");
    expect(composeAge(0, 7)).toBe("7 months");
    expect(parseAgeParts("4 years 2 months")).toEqual({ years: "4", months: "2" });
    expect(parseAgeParts("7 months")).toEqual({ years: "", months: "7" });
  });
});
