import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import QRCode from "qrcode";

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

export async function buildWeeklyCapacitySummaryHtml(input: { internalReportId: string; protectedReportUrl: string; reviewedBy: string; weekStartDate: string; weekEndDate: string; reviewedAt: string; unacknowledgedAlertCount: number; rows: Array<{ staffName: string; triageCapacity: number; assignmentCount: number; targetEffectiveAt: string }> }) {
  const rows = input.rows.map((row) => `<tr><td>${escapeHtml(row.staffName)}</td><td>${row.triageCapacity}</td><td>${row.assignmentCount}</td><td>${escapeHtml(new Date(row.targetEffectiveAt).toLocaleString())}</td></tr>`).join("") || "<tr><td colspan=\"4\">No recorded staff capacity targets were available for this reviewed week.</td></tr>";
  const qrSvg = await QRCode.toString(input.protectedReportUrl, { type: "svg", width: 112, margin: 1, errorCorrectionLevel: "M", color: { dark: "#102A43", light: "#FFFFFF" } }); const qrDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>@page { margin: 36px; } body { font-family: Arial, sans-serif; color: #102A43; line-height: 1.45; } header { border-bottom: 3px solid #0E7490; padding-bottom: 14px; margin-bottom: 20px; } h1 { font-size: 22px; margin: 0 0 4px; } p { font-size: 12px; margin: 4px 0; } .label { font-size: 10px; color: #627D98; font-weight: bold; letter-spacing: .4px; } table { width: 100%; border-collapse: collapse; margin-top: 16px; } th, td { border: 1px solid #D9E2EC; padding: 8px; text-align: left; font-size: 11px; } th { background: #E0F2F3; } footer { border-top: 1px solid #D9E2EC; color: #627D98; font-size: 10px; margin-top: 24px; padding-top: 12px; } .reference { display: flex; gap: 12px; align-items: center; } .qr { width: 84px; height: 84px; }</style></head><body><header><p class="label">RAINBOW CHILD DEVELOPMENT CLINIC · INTERNAL OPERATIONAL REPORT</p><h1>Reviewed Weekly Capacity Summary</h1><p><strong>Reviewed week:</strong> ${escapeHtml(input.weekStartDate)} to ${escapeHtml(input.weekEndDate)}</p><p><strong>Clinician review prepared:</strong> ${escapeHtml(new Date(input.reviewedAt).toLocaleString())}</p><p><strong>Unacknowledged capacity alerts:</strong> ${input.unacknowledgedAlertCount}</p></header><table><thead><tr><th>Staff member</th><th>Configured target</th><th>Assignments recorded</th><th>Target effective at</th></tr></thead><tbody>${rows}</tbody></table><footer><div class="reference"><img class="qr" src="${qrDataUrl}" alt="Protected internal report reference"/><div><p><strong>Internal report identifier:</strong> ${escapeHtml(input.internalReportId)}</p><p><strong>Clinician review:</strong> ${escapeHtml(input.reviewedBy)} · ${escapeHtml(new Date(input.reviewedAt).toLocaleString())}</p><p>Scan only after normal clinic sign-in. This QR reference does not grant public access and does not contain patient data.</p></div></div><p>This is a clinician-approved internal tracking identifier, not a cryptographic signature, performance certification, print-completion proof, or delivery record. The report provides aggregate operational workload context only and excludes child information, appointment details, clinical content, and staff performance ratings.</p></footer></body></html>`;
}

export async function exportWeeklyCapacitySummaryPdf(html: string) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return { ok: false, message: "PDF export is not available in this browser session." };
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return { ok: false, message: "Allow pop-ups to open the printable weekly capacity report." };
    popup.document.write(html); popup.document.close(); popup.focus(); popup.print();
    return { ok: true, message: "A printable weekly capacity report opened. Choose ‘Save as PDF’ in your browser print dialog." };
  }
  try {
    const { uri } = await Print.printToFileAsync({ html, margins: { top: 34, right: 34, bottom: 34, left: 34 } });
    if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share reviewed weekly capacity summary", UTI: ".pdf" }); return { ok: true, message: "Reviewed weekly capacity PDF is ready to save or share." }; }
    return { ok: false, message: "Weekly capacity PDF created, but sharing is not available on this device." };
  } catch { return { ok: false, message: "We could not create the weekly capacity PDF. Please try again." }; }
}
