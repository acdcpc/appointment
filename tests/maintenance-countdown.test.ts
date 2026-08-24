import { describe, expect, it } from "vitest";
import { maintenanceCountdownLabel, normalizeMaintenanceCountdownEndpoint } from "../lib/maintenance-countdown";

describe("maintenance countdown", () => {
  it("renders a rounded estimate-only remaining time", () => {
    expect(maintenanceCountdownLabel("2026-08-24T12:31:00.000Z", Date.parse("2026-08-24T12:00:00.000Z"))).toBe("Estimated time remaining: 31m.");
    expect(maintenanceCountdownLabel("2026-08-24T14:01:00.000Z", Date.parse("2026-08-24T12:00:00.000Z"))).toBe("Estimated time remaining: 2h 1m.");
  });

  it("does not imply that an elapsed estimate restores access", () => {
    expect(maintenanceCountdownLabel("2026-08-24T11:59:00.000Z", Date.parse("2026-08-24T12:00:00.000Z"))).toContain("maintenance remains active");
    expect(normalizeMaintenanceCountdownEndpoint("not-a-date")).toBeNull();
  });
});
