export type MaintenanceNotificationPreferenceExportRow = { email: string; status: "requested" | "withdrawn"; maintenanceChangedAt: string; requestedAt: string; updatedAt: string };
const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;

export function buildMaintenanceNotificationPreferenceCsv(rows: MaintenanceNotificationPreferenceExportRow[]) {
  const heading = ["# Confidential maintenance notification preferences", "# Prepared after super-admin review. This export does not send email or prove delivery, viewing, retention, or disposal.", "email,status,maintenance_started_at,preference_recorded_at,preference_updated_at"];
  return [...heading, ...rows.map((row) => [row.email, row.status, row.maintenanceChangedAt, row.requestedAt, row.updatedAt].map(escapeCsv).join(","))].join("\n");
}
