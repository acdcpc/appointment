import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";
import * as FileSystem from "expo-file-system/legacy";
import type { ChildProfile, GrowthMetric, MedicalHistoryEntry, PatientAuditEvent, PediatricAppointment, PrescriptionRecord, ReferralLetterSettings } from "@/lib/pediatric-care";

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

export function buildChildRecordHtml(child: ChildProfile, history: MedicalHistoryEntry[], prescriptions: PrescriptionRecord[]) {
  const historyRows = history.map((entry) => `<article><p class="label">${escapeHtml(entry.category)} · ${escapeHtml(entry.occurredOn)}</p><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.note)}</p></article>`).join("") || "<p>No parent-visible medical history entries are available.</p>";
  const prescriptionRows = prescriptions.map((record) => `<article><p class="label">${escapeHtml(record.status.toUpperCase())} · Issued ${escapeHtml(record.issuedOn)}</p><h3>${escapeHtml(record.medication)}</h3><p>${escapeHtml(record.instructions)}</p></article>`).join("") || "<p>No parent-visible prescription records are available.</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>@page { margin: 34px; } body { font-family: Arial, sans-serif; color: #102A43; line-height: 1.45; } header { border-bottom: 3px solid #0E7490; padding-bottom: 14px; margin-bottom: 22px; } h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 18px; color: #0E7490; margin: 26px 0 10px; } h3 { font-size: 14px; margin: 2px 0 4px; } p { font-size: 12px; margin: 3px 0; } .label { font-size: 10px; color: #627D98; font-weight: bold; letter-spacing: .4px; } article { border: 1px solid #D9E2EC; border-radius: 8px; padding: 12px; margin: 8px 0; } footer { border-top: 1px solid #D9E2EC; color: #627D98; font-size: 10px; margin-top: 28px; padding-top: 12px; }</style></head><body><header><p class="label">DR. ANIL OJHA CHILD CARE</p><h1>Child Medical Record Summary</h1><p><strong>${escapeHtml(child.name)}</strong> · Date of birth: ${escapeHtml(child.dateOfBirth)}</p><p>Prepared for parent or guardian: ${escapeHtml(child.parentName)}</p></header><h2>Medical history</h2>${historyRows}<h2>Prescription records</h2>${prescriptionRows}<footer>This summary contains parent-visible child records only. Contact Dr. Anil Ojha’s practice with questions or for the complete clinical record.</footer></body></html>`;
}

export function buildChildTimelineHtml(child: ChildProfile, history: MedicalHistoryEntry[], prescriptions: PrescriptionRecord[], growthMetrics: GrowthMetric[], appointments: PediatricAppointment[]) {
  const visitRows = appointments.filter((item) => item.status !== "cancelled").map((item) => `<article><p class="label">VISIT · ${escapeHtml(item.date)} · ${escapeHtml(item.time)}</p><h3>${escapeHtml(item.service)}</h3><p>${escapeHtml(item.reason)} · ${item.durationMinutes} minutes · ${escapeHtml(item.status)}</p></article>`).join("") || "<p>No visible visit records are available.</p>";
  const historyRows = history.map((entry) => `<article><p class="label">${escapeHtml(entry.category)} · ${escapeHtml(entry.occurredOn)}</p><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.note)}</p></article>`).join("") || "<p>No parent-visible history entries are available.</p>";
  const prescriptionRows = prescriptions.map((record) => `<article><p class="label">PRESCRIPTION · ${escapeHtml(record.issuedOn)} · ${escapeHtml(record.status.toUpperCase())}</p><h3>${escapeHtml(record.medication)}</h3><p>${escapeHtml(record.instructions)}</p></article>`).join("") || "<p>No parent-visible prescription records are available.</p>";
  const growthRows = growthMetrics.map((metric) => `<article><p class="label">GROWTH · ${escapeHtml(metric.occurredOn)}</p><h3>${metric.weightKg} kg · ${metric.heightCm} cm</h3><p>${escapeHtml(metric.note)}</p></article>`).join("") || "<p>No visible growth measurements are available.</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>@page { margin: 34px; } body { font-family: Arial, sans-serif; color: #102A43; line-height: 1.45; } header { border-bottom: 3px solid #0E7490; padding-bottom: 14px; margin-bottom: 22px; } h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 18px; color: #0E7490; margin: 26px 0 10px; } h3 { font-size: 14px; margin: 2px 0 4px; } p { font-size: 12px; margin: 3px 0; } .label { font-size: 10px; color: #627D98; font-weight: bold; letter-spacing: .4px; } article { border: 1px solid #D9E2EC; border-radius: 8px; padding: 12px; margin: 8px 0; } footer { border-top: 1px solid #D9E2EC; color: #627D98; font-size: 10px; margin-top: 28px; padding-top: 12px; }</style></head><body><header><p class="label">DR. ANIL OJHA CHILD CARE</p><h1>Child Timeline Summary</h1><p><strong>${escapeHtml(child.name)}</strong> · Date of birth: ${escapeHtml(child.dateOfBirth)}</p><p>Prepared for parent or guardian: ${escapeHtml(child.parentName)}</p></header><h2>Visits</h2>${visitRows}<h2>Medical history</h2>${historyRows}<h2>Prescription records</h2>${prescriptionRows}<h2>Growth measurements</h2>${growthRows}<footer>This summary contains parent-visible records and factual growth measurements only. It is not a diagnostic or treatment document. Contact Dr. Anil Ojha’s practice with questions or for the complete clinical record.</footer></body></html>`;
}

export function buildRescheduleConfirmationHtml(child: ChildProfile, appointment: PediatricAppointment) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>@page { margin: 38px; } body { font-family: Arial, sans-serif; color: #102A43; line-height: 1.5; } header { border-bottom: 3px solid #0E7490; padding-bottom: 14px; margin-bottom: 22px; } h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 17px; color: #0E7490; margin: 22px 0 10px; } p { font-size: 12px; margin: 5px 0; } .label { font-size: 10px; color: #627D98; font-weight: bold; letter-spacing: .4px; } .details { border: 1px solid #D9E2EC; border-radius: 8px; padding: 14px; } footer { border-top: 1px solid #D9E2EC; color: #627D98; font-size: 10px; margin-top: 28px; padding-top: 12px; }</style></head><body><header><p class="label">RAINBOW CHILD DEVELOPMENT CLINIC</p><h1>Appointment Reschedule Confirmation</h1><p>Prepared for parent or guardian: ${escapeHtml(child.parentName)}</p></header><p>This confirms that the appointment below has been updated by the clinic.</p><section class="details"><h2>${escapeHtml(child.name)}</h2><p><strong>Service:</strong> ${escapeHtml(appointment.service)}</p><p><strong>Updated appointment:</strong> ${escapeHtml(appointment.date)} · ${escapeHtml(appointment.time)}</p><p><strong>Duration:</strong> ${appointment.durationMinutes} minutes</p><p><strong>Clinic:</strong> Rainbow Child Development Clinic</p><p><strong>Clinician:</strong> Associate Professor Dr. Anil Ojha, MBBS, MD, FCCH</p></section><footer>Generated ${escapeHtml(new Date().toLocaleString())}. Please contact Rainbow Child Development Clinic on 9765002862 if you need to discuss this appointment.</footer></body></html>`;
}

export function buildReferralLetterHtml(child: ChildProfile, recipient: string, purpose: string, body: string, settings: ReferralLetterSettings) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>@page { margin: 44px; } body { font-family: Arial, sans-serif; color: #102A43; line-height: 1.55; } header { border-bottom: 3px solid #0E7490; padding-bottom: 14px; margin-bottom: 26px; } h1 { font-size: 22px; margin: 0 0 4px; } p { font-size: 12px; white-space: pre-wrap; } .label { font-size: 10px; color: #627D98; font-weight: bold; letter-spacing: .4px; } footer { border-top: 1px solid #D9E2EC; color: #627D98; font-size: 10px; margin-top: 32px; padding-top: 12px; }</style></head><body><header><p class="label">${escapeHtml(settings.clinicName || "Rainbow Child Development Clinic")}</p><h1>Referral Letter</h1><p><strong>${escapeHtml(child.name)}</strong> · Date of birth: ${escapeHtml(child.dateOfBirth)}</p>${settings.clinicContact ? `<p>${escapeHtml(settings.clinicContact)}</p>` : ""}</header><p>${escapeHtml(recipient || "To the receiving clinician")}</p><p><strong>Purpose:</strong> ${escapeHtml(purpose || "Clinical referral")}</p><p>${escapeHtml(body || "Please add the referral letter body before exporting.")}</p><p>Sincerely,\n${escapeHtml(settings.signatureName || "Associate Professor Dr. Anil Ojha, MBBS, MD, FCCH")}\n${escapeHtml(settings.signatureTitle || "Developmental Pediatrician")}</p><footer>This referral letter was prepared for clinician review. Confirm recipient, purpose, contact details, and signature before using it outside the practice.</footer></body></html>`;
}

export function buildChildAuditHtml(child: ChildProfile, events: PatientAuditEvent[], filters: { dateRange: string; staffAction: string } = { dateRange: "All recorded dates", staffAction: "All clinician actions" }) {
  const rows = events.map((event) => `<article><p class="label">${escapeHtml(event.type === "appointment-change" ? "APPOINTMENT CHANGE" : event.type === "referral-letter" ? "REFERRAL LETTER" : event.type === "patient-communication" ? "PARENT COMMUNICATION" : "REFERRAL EMAIL SHARE")} · ${escapeHtml(event.occurredOn)} · ${escapeHtml(event.actorRole)}</p><h3>${escapeHtml(event.summary)}</h3><p><strong>Recorded by:</strong> ${escapeHtml(event.actorName ?? "Clinician")}</p>${event.attemptedAt ? `<p><strong>Exact attempt time:</strong> ${escapeHtml(event.attemptedAt)}</p>` : ""}${event.deliveryStatus ? `<p><strong>Platform status:</strong> ${escapeHtml(event.deliveryStatus.replace("-", " "))}</p>` : ""}${event.message ? `<p>${escapeHtml(event.message)}</p>` : ""}</article>`).join("") || "<p>No permitted audit events are available for this child and filter scope.</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>@page { margin: 36px; } body { font-family: Arial, sans-serif; color: #102A43; line-height: 1.45; } header { border-bottom: 3px solid #0E7490; padding-bottom: 14px; margin-bottom: 20px; } h1 { font-size: 22px; margin: 0 0 4px; } h3 { font-size: 14px; margin: 2px 0 4px; } p { font-size: 12px; margin: 3px 0; white-space: pre-wrap; } .label { font-size: 10px; color: #627D98; font-weight: bold; } article { border: 1px solid #D9E2EC; border-radius: 8px; padding: 12px; margin: 8px 0; }</style></head><body><header><p class="label">DR. ANIL OJHA CHILD CARE</p><h1>Child Audit Log</h1><p><strong>${escapeHtml(child.name)}</strong> · Date of birth: ${escapeHtml(child.dateOfBirth)}</p><p><strong>Date range:</strong> ${escapeHtml(filters.dateRange)}</p><p><strong>Staff action scope:</strong> ${escapeHtml(filters.staffAction)}</p></header>${rows}</body></html>`;
}

export function buildAuditArchiveHistoryHtml(runs: { executedAt: string; executionType: "manual" | "scheduled"; archivedCount: number; retentionDays: number; executedBy: string; reason: string }[], dateRange = "All archive run dates") {
  const rows = runs.map((run) => `<article><p class="label">${escapeHtml(run.executionType.toUpperCase())} ARCHIVE · ${escapeHtml(new Date(run.executedAt).toLocaleString())}</p><h3>${run.archivedCount} audit record${run.archivedCount === 1 ? "" : "s"} archived</h3><p><strong>Retention period:</strong> ${run.retentionDays} days</p><p><strong>Run by:</strong> ${escapeHtml(run.executedBy)}</p><p><strong>Reason:</strong> ${escapeHtml(run.reason)}</p></article>`).join("") || "<p>No archive runs are recorded yet.</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>@page { margin: 36px; } body { font-family: Arial, sans-serif; color: #102A43; line-height: 1.45; } header { border-bottom: 3px solid #0E7490; padding-bottom: 14px; margin-bottom: 20px; } h1 { font-size: 22px; margin: 0 0 4px; } h3 { font-size: 14px; margin: 2px 0 4px; } p { font-size: 12px; margin: 3px 0; white-space: pre-wrap; } .label { font-size: 10px; color: #627D98; font-weight: bold; } article { border: 1px solid #D9E2EC; border-radius: 8px; padding: 12px; margin: 8px 0; } footer { border-top: 1px solid #D9E2EC; color: #627D98; font-size: 10px; margin-top: 24px; padding-top: 12px; }</style></head><body><header><p class="label">DR. ANIL OJHA CHILD CARE</p><h1>Audit Archive History</h1><p><strong>Date scope:</strong> ${escapeHtml(dateRange)}</p><p>Generated ${escapeHtml(new Date().toLocaleString())}</p></header>${rows}<footer>This staff report contains archive-run metadata only. It excludes child identifiers, patient names, and clinical text.</footer></body></html>`;
}

export async function exportChildRecordPdf(html: string) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return { ok: false, message: "PDF export is not available in this browser session." };
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return { ok: false, message: "Allow pop-ups to open the printable PDF document." };
    popup.document.write(html); popup.document.close(); popup.focus(); popup.print();
    return { ok: true, message: "A printable document opened. Choose ‘Save as PDF’ in your browser print dialog." };
  }
  try {
    const { uri } = await Print.printToFileAsync({ html, margins: { top: 34, right: 34, bottom: 34, left: 34 } });
    if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Download child record PDF", UTI: ".pdf" }); return { ok: true, message: "Your child record PDF is ready to save or share." }; }
    return { ok: false, message: "PDF created, but sharing is not available on this device." };
  } catch {
    return { ok: false, message: "We could not create the PDF. Please try again." };
  }
}

export async function composeReferralEmail(html: string, recipientEmail: string, subject: string, body: string) {
  if (!recipientEmail.trim()) return { ok: false, status: "unavailable" as const, message: "Add the selected specialist’s email address before opening an email draft." };
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return { ok: false, status: "unavailable" as const, message: "Email sharing is not available in this browser session." };
    window.location.href = `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${body}\n\nPlease attach the referral letter generated in this app before sending.`)}`;
    return { ok: true, status: "draft-opened" as const, message: "Your email client was opened with a draft. Attach the exported referral letter, review it, and send it yourself." };
  }
  try {
    if (!(await MailComposer.isAvailableAsync())) return { ok: false, status: "unavailable" as const, message: "No configured email client is available on this device." };
    const { uri } = await Print.printToFileAsync({ html, margins: { top: 34, right: 34, bottom: 34, left: 34 } });
    const result = await MailComposer.composeAsync({ recipients: [recipientEmail.trim()], subject, body, attachments: [uri] });
    const reported = String(result.status).toLowerCase(); const status = reported === "sent" ? "sent" as const : reported === "saved" ? "saved" as const : reported === "cancelled" ? "cancelled" as const : "draft-opened" as const;
    return { ok: true, status, message: status === "sent" ? "The system email flow reported the referral as sent." : "A referral email draft opened. Review the recipient, content, and attachment before sending." };
  } catch {
    return { ok: false, status: "unavailable" as const, message: "We could not open the referral email draft. Please export the letter and use your secure email client." };
  }
}

export async function composePatientEmail(html: string | undefined, recipientEmail: string, subject: string, body: string) {
  if (!recipientEmail.trim()) return { ok: false, status: "unavailable" as const, message: "Enter the parent or guardian email before opening a reviewed draft." };
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return { ok: false, status: "unavailable" as const, message: "Email sharing is not available in this browser session." };
    const attachmentNotice = html ? "\n\nA child-specific report was prepared in the clinic app. Print or save it as a PDF, attach it in your email client, then review before sending." : "";
    window.location.href = `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${body}${attachmentNotice}`)}`;
    return { ok: true, status: "draft-opened" as const, message: "A parent email draft opened. Review the recipient and message; attach the prepared report yourself if needed." };
  }
  try {
    if (!(await MailComposer.isAvailableAsync())) return { ok: false, status: "unavailable" as const, message: "No configured email client is available on this device." };
    const attachment = html ? (await Print.printToFileAsync({ html, margins: { top: 34, right: 34, bottom: 34, left: 34 } })).uri : undefined;
    const result = await MailComposer.composeAsync({ recipients: [recipientEmail.trim()], subject, body, attachments: attachment ? [attachment] : undefined });
    const reported = String(result.status).toLowerCase(); const status = reported === "sent" ? "sent" as const : reported === "saved" ? "saved" as const : reported === "cancelled" ? "cancelled" as const : "draft-opened" as const;
    return { ok: true, status, message: status === "sent" ? "The device mail client reported this parent communication as sent." : "A reviewed parent email draft opened. Confirm the recipient, message, and attachment before sending." };
  } catch {
    return { ok: false, status: "unavailable" as const, message: "We could not open the parent email draft. Please export the child record and use the clinic’s secure email client." };
  }
}

export type ReportAcknowledgementEvidence = { scope: "record-pdf" | "timeline-report"; guardianName: string; guardianEmail: string; deliveryStatus: string; createdAt: string; acknowledgedAt: string | null; acknowledgementText: string | null };

export function buildReportAcknowledgementHtml(child: ChildProfile, shares: ReportAcknowledgementEvidence[]) {
  const rows = shares.map((share) => `<article><p class="label">${escapeHtml(share.scope === "record-pdf" ? "MEDICAL RECORD PDF" : "TIMELINE REPORT PDF")} · ${escapeHtml(new Date(share.createdAt).toLocaleString())}</p><h3>${escapeHtml(share.guardianName)}</h3><p><strong>Recipient email:</strong> ${escapeHtml(share.guardianEmail)}</p><p><strong>Draft/client outcome:</strong> ${escapeHtml(share.deliveryStatus.replace("-", " "))}</p><p><strong>Explicit receipt acknowledgement:</strong> ${share.acknowledgedAt ? escapeHtml(new Date(share.acknowledgedAt).toLocaleString()) : "Not yet recorded"}</p>${share.acknowledgementText ? `<p><strong>Guardian statement:</strong> ${escapeHtml(share.acknowledgementText)}</p>` : ""}</article>`).join("") || "<p>No report acknowledgement records are available for this child.</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>@page { margin: 36px; } body { font-family: Arial, sans-serif; color: #102A43; line-height: 1.45; } header { border-bottom: 3px solid #0E7490; padding-bottom: 14px; margin-bottom: 20px; } h1 { font-size: 22px; margin: 0 0 4px; } h3 { font-size: 14px; margin: 2px 0 4px; } p { font-size: 12px; margin: 3px 0; white-space: pre-wrap; } .label { font-size: 10px; color: #627D98; font-weight: bold; } article { border: 1px solid #D9E2EC; border-radius: 8px; padding: 12px; margin: 8px 0; } footer { border-top: 1px solid #D9E2EC; color: #627D98; font-size: 10px; margin-top: 24px; padding-top: 12px; }</style></head><body><header><p class="label">RAINBOW CHILD DEVELOPMENT CLINIC</p><h1>Report Acknowledgement Status</h1><p><strong>${escapeHtml(child.name)}</strong> · Date of birth: ${escapeHtml(child.dateOfBirth)}</p><p>Generated ${escapeHtml(new Date().toLocaleString())}</p></header>${rows}<footer>This clinician-only attachment documents platform-reported sharing outcomes and explicit guardian receipt acknowledgements. It does not prove report delivery, reading, understanding, or agreement.</footer></body></html>`;
}

export function buildReportAcknowledgementCsv(shares: ReportAcknowledgementEvidence[]) {
  const escapeCsv = (value: string | null) => `"${(value ?? "").replaceAll('"', '""')}"`;
  return ["Report scope,Guardian name,Guardian email,Draft/client outcome,Shared at,Explicit receipt at,Guardian acknowledgement", ...shares.map((share) => [share.scope, share.guardianName, share.guardianEmail, share.deliveryStatus, share.createdAt, share.acknowledgedAt, share.acknowledgementText].map(escapeCsv).join(","))].join("\n");
}

export async function exportReportAcknowledgementCsv(csv: string, filename: string) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return { ok: false, message: "CSV export is not available in this browser session." };
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
    return { ok: true, message: "Acknowledgement status CSV downloaded." };
  }
  try {
    const directory = FileSystem.cacheDirectory;
    if (!directory) return { ok: false, message: "Temporary file storage is unavailable on this device." };
    const uri = `${directory}${filename}`; await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (!(await Sharing.isAvailableAsync())) return { ok: false, message: "CSV created, but sharing is not available on this device." };
    await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Export acknowledgement status" });
    return { ok: true, message: "Acknowledgement status CSV is ready to save or attach." };
  } catch { return { ok: false, message: "We could not create the acknowledgement status CSV." }; }
}

export type GuardianVerificationContact = { fullName: string; relationship: string; email: string; status: "pending" | "confirmed"; confirmedAt: string | null };

export function buildGuardianContactVerificationHtml(child: ChildProfile, contacts: GuardianVerificationContact[]) {
  const rows = contacts.map((contact) => `<tr><td>${escapeHtml(contact.fullName)}</td><td>${escapeHtml(contact.relationship)}</td><td>${escapeHtml(contact.email)}</td><td>${escapeHtml(contact.status === "confirmed" ? "Confirmed" : "Pending review")}</td><td>${contact.confirmedAt ? escapeHtml(new Date(contact.confirmedAt).toLocaleDateString()) : "—"}</td><td></td></tr>`).join("") || "<tr><td colspan=\"6\">No guardian contact records are currently saved for this child.</td></tr>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>@page { margin: 34px; } body { font-family: Arial, sans-serif; color: #102A43; line-height: 1.4; } header { border-bottom: 3px solid #0E7490; padding-bottom: 12px; margin-bottom: 18px; } h1 { font-size: 22px; margin: 0 0 4px; } h2 { color: #0E7490; font-size: 16px; margin: 22px 0 9px; } p { font-size: 12px; margin: 4px 0; } table { width: 100%; border-collapse: collapse; font-size: 10px; } th, td { border: 1px solid #BCCCDC; padding: 8px; text-align: left; vertical-align: top; } th { background: #E0F2F3; } .label { font-size: 10px; color: #627D98; font-weight: bold; letter-spacing: .4px; } .line { height: 24px; border-bottom: 1px solid #627D98; margin: 8px 0; } footer { margin-top: 22px; border-top: 1px solid #D9E2EC; padding-top: 10px; color: #627D98; font-size: 10px; }</style></head><body><header><p class="label">RAINBOW CHILD DEVELOPMENT CLINIC</p><h1>Guardian Contact Verification Form</h1><p><strong>Child:</strong> ${escapeHtml(child.name)} · Date of birth: ${escapeHtml(child.dateOfBirth)}</p><p><strong>Current parent/guardian on record:</strong> ${escapeHtml(child.parentName)}</p></header><p>Please review each contact with the parent or guardian during the clinic visit. Correct details as needed, obtain consent according to clinic policy, and have a clinician save the confirmed contact in the protected dashboard.</p><h2>Contact details to verify</h2><table><thead><tr><th>Full name</th><th>Relationship</th><th>Email</th><th>Current status</th><th>Last confirmed</th><th>Parent initials</th></tr></thead><tbody>${rows}</tbody></table><h2>New or corrected contact</h2><p>Full name</p><div class="line"></div><p>Relationship to child</p><div class="line"></div><p>Email address</p><div class="line"></div><p>Parent/guardian confirms that the details above are correct and may be used for clinic communication under clinic policy.</p><p>Parent/guardian signature</p><div class="line"></div><p>Date</p><div class="line"></div><p>Clinician name and signature</p><div class="line"></div><footer>This paper form is for in-person verification. It does not itself authorize automatic messaging. Update the secure clinic record only after clinician review.</footer></body></html>`;
}
