import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { ChildProfile, MedicalHistoryEntry, PrescriptionRecord } from "@/lib/pediatric-care";

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

export function buildChildRecordHtml(child: ChildProfile, history: MedicalHistoryEntry[], prescriptions: PrescriptionRecord[]) {
  const historyRows = history.map((entry) => `<article><p class="label">${escapeHtml(entry.category)} · ${escapeHtml(entry.occurredOn)}</p><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.note)}</p></article>`).join("") || "<p>No parent-visible medical history entries are available.</p>";
  const prescriptionRows = prescriptions.map((record) => `<article><p class="label">${escapeHtml(record.status.toUpperCase())} · Issued ${escapeHtml(record.issuedOn)}</p><h3>${escapeHtml(record.medication)}</h3><p>${escapeHtml(record.instructions)}</p></article>`).join("") || "<p>No parent-visible prescription records are available.</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>@page { margin: 34px; } body { font-family: Arial, sans-serif; color: #102A43; line-height: 1.45; } header { border-bottom: 3px solid #0E7490; padding-bottom: 14px; margin-bottom: 22px; } h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 18px; color: #0E7490; margin: 26px 0 10px; } h3 { font-size: 14px; margin: 2px 0 4px; } p { font-size: 12px; margin: 3px 0; } .label { font-size: 10px; color: #627D98; font-weight: bold; letter-spacing: .4px; } article { border: 1px solid #D9E2EC; border-radius: 8px; padding: 12px; margin: 8px 0; } footer { border-top: 1px solid #D9E2EC; color: #627D98; font-size: 10px; margin-top: 28px; padding-top: 12px; }</style></head><body><header><p class="label">DR. ANIL OJHA CHILD CARE</p><h1>Child Medical Record Summary</h1><p><strong>${escapeHtml(child.name)}</strong> · Date of birth: ${escapeHtml(child.dateOfBirth)}</p><p>Prepared for parent or guardian: ${escapeHtml(child.parentName)}</p></header><h2>Medical history</h2>${historyRows}<h2>Prescription records</h2>${prescriptionRows}<footer>This summary contains parent-visible child records only. Contact Dr. Anil Ojha’s practice with questions or for the complete clinical record.</footer></body></html>`;
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
