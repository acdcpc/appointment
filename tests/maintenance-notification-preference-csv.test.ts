import { describe, expect, it } from "vitest";
import { buildMaintenanceNotificationPreferenceCsv } from "../lib/maintenance-notification-preference-csv-format";

describe("maintenance notification preference CSV", () => {
  it("escapes email values and retains only preference metadata", () => {
    const csv = buildMaintenanceNotificationPreferenceCsv([{ email: 'guardian"example@example.com', status: "requested", maintenanceChangedAt: "2026-08-24T10:00:00.000Z", requestedAt: "2026-08-24T10:01:00.000Z", updatedAt: "2026-08-24T10:01:00.000Z" }]);
    expect(csv).toContain('"guardian""example@example.com"');
    expect(csv).toContain("preference_recorded_at");
  });

  it("labels preparation without claiming email delivery", () => {
    const csv = buildMaintenanceNotificationPreferenceCsv([]);
    expect(csv).toContain("does not send email");
    expect(csv).not.toContain("delivered");
  });
});
