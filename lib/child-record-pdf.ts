import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";
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

export function buildReferralLetterHtml(child: ChildProfile, recipient: string, purpose: string, body: string, settings: ReferralLetterSettings) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>@page { margin: 44px; } body { font-family: Arial, sans-serif; color: #102A43; line-height: 1.55; } header { border-bottom: 3px solid #0E7490; padding-bottom: 14px; margin-bottom: 26px; } h1 { font-size: 22px; margin: 0 0 4px; } p { font-size: 12px; white-space: pre-wrap; } .label { font-size: 10px; color: #627D98; font-weight: bold; letter-spacing: .4px; } footer { border-top: 1px solid #D9E2EC; color: #627D98; font-size: 10px; margin-top: 32px; padding-top: 12px; }</style></head><body><header><p class="label">${escapeHtml(settings.clinicName || "Dr. Anil Ojha Child Care")}</p><h1>Referral Letter</h1><p><strong>${escapeHtml(child.name)}</strong> · Date of birth: ${escapeHtml(child.dateOfBirth)}</p>${settings.clinicContact ? `<p>${escapeHtml(settings.clinicContact)}</p>` : ""}</header><p>${escapeHtml(recipient || "To the receiving clinician")}</p><p><strong>Purpose:</strong> ${escapeHtml(purpose || "Clinical referral")}</p><p>${escapeHtml(body || "Please add the referral letter body before exporting.")}</p><p>Sincerely,\n${escapeHtml(settings.signatureName || "Associate Professor Dr. Anil Ojha")}\n${escapeHtml(settings.signatureTitle || "Pediatrician & Child Development Specialist")}</p><footer>This referral letter was prepared for clinician review. Confirm recipient, purpose, contact details, and signature before using it outside the practice.</footer></body></html>`;
}

export function buildChildAuditHtml(child: ChildProfile, events: PatientAuditEvent[]) {
  const rows = events.map((event) => `<article><p class="label">${escapeHtml(event.type === "appointment-change" ? "APPOINTMENT CHANGE" : "REFERRAL LETTER")} · ${escapeHtml(event.occurredOn)} · ${escapeHtml(event.actorRole)}</p><h3>${escapeHtml(event.summary)}</h3>${event.message ? `<p>${escapeHtml(event.message)}</p>` : ""}</article>`).join("") || "<p>No permitted audit events are available for this child.</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>@page { margin: 36px; } body { font-family: Arial, sans-serif; color: #102A43; line-height: 1.45; } header { border-bottom: 3px solid #0E7490; padding-bottom: 14px; margin-bottom: 20px; } h1 { font-size: 22px; margin: 0 0 4px; } h3 { font-size: 14px; margin: 2px 0 4px; } p { font-size: 12px; margin: 3px 0; white-space: pre-wrap; } .label { font-size: 10px; color: #627D98; font-weight: bold; } article { border: 1px solid #D9E2EC; border-radius: 8px; padding: 12px; margin: 8px 0; }</style></head><body><header><p class="label">DR. ANIL OJHA CHILD CARE</p><h1>Child Audit Log</h1><p><strong>${escapeHtml(child.name)}</strong> · Date of birth: ${escapeHtml(child.dateOfBirth)}</p></header>${rows}</body></html>`;
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
  if (!recipientEmail.trim()) return { ok: false, message: "Add the selected specialist’s email address before opening an email draft." };
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return { ok: false, message: "Email sharing is not available in this browser session." };
    window.location.href = `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${body}\n\nPlease attach the referral letter generated in this app before sending.`)}`;
    return { ok: true, message: "Your email client was opened with a draft. Attach the exported referral letter, review it, and send it yourself." };
  }
  try {
    if (!(await MailComposer.isAvailableAsync())) return { ok: false, message: "No configured email client is available on this device." };
    const { uri } = await Print.printToFileAsync({ html, margins: { top: 34, right: 34, bottom: 34, left: 34 } });
    const result = await MailComposer.composeAsync({ recipients: [recipientEmail.trim()], subject, body, attachments: [uri] });
    return { ok: true, message: result.status === "sent" ? "The system email flow reported the referral as sent." : "A referral email draft opened. Review the recipient, content, and attachment before sending." };
  } catch {
    return { ok: false, message: "We could not open the referral email draft. Please export the letter and use your secure email client." };
  }
}
