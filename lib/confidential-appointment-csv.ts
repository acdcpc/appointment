import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { ConfidentialAppointmentRow } from "./confidential-appointment-csv-format";
export { buildConfidentialAppointmentCsv, type ConfidentialAppointmentRow } from "./confidential-appointment-csv-format";

export async function exportConfidentialAppointmentCsv(csv: string) {
  const filename = `confidential-appointment-records-${new Date().toISOString().slice(0, 10)}.csv`;
  try {
    if (Platform.OS === "web") { if (typeof window === "undefined") return { ok: false, message: "CSV export is not available in this browser session." }; const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); return { ok: true, message: "Confidential appointment CSV download initiated. Store it securely." }; }
    const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory; if (!directory) return { ok: false, message: "A secure local export location is unavailable on this device." }; const uri = `${directory}${filename}`; await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 }); if (!(await Sharing.isAvailableAsync())) return { ok: false, message: "CSV was prepared locally, but system sharing is unavailable." }; await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Confidential appointment records" }); return { ok: true, message: "Confidential appointment CSV is ready for a deliberate system share or save action." };
  } catch { return { ok: false, message: "The confidential appointment CSV could not be prepared." }; }
}
