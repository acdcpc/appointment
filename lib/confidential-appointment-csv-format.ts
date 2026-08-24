export type ConfidentialAppointmentRow = { appointmentId: string; clinicianUserId: number; childId: string; service: string; appointmentDate: string; appointmentTime: string; durationMinutes: number; reason: string; status: string; changeMessage: string | null; guardianConfirmedAt: string | null; rescheduledAt: string | null; createdAt: string; updatedAt: string };
const escapeCsv = (value: string | number | null) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export function buildConfidentialAppointmentCsv(rows: ConfidentialAppointmentRow[], startDate: string, endDate: string) {
  const header = ["CONFIDENTIAL — Rainbow Child Development Clinic appointment records", `Prepared range: ${startDate} to ${endDate}`, "Preparation is audited. Download does not prove delivery, viewing, or secure storage.", ""];
  const columns = ["appointment_id", "clinician_user_id", "child_reference", "service", "appointment_date", "appointment_time", "duration_minutes", "reason", "status", "change_message", "guardian_confirmed_at", "rescheduled_at", "created_at", "updated_at"];
  const data = rows.map((row) => [row.appointmentId, row.clinicianUserId, row.childId, row.service, row.appointmentDate, row.appointmentTime, row.durationMinutes, row.reason, row.status, row.changeMessage, row.guardianConfirmedAt, row.rescheduledAt, row.createdAt, row.updatedAt].map(escapeCsv).join(","));
  return [...header, columns.join(","), ...data].join("\n");
}
