import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
export { buildMaintenanceNotificationPreferenceCsv, type MaintenanceNotificationPreferenceExportRow } from "./maintenance-notification-preference-csv-format";

export async function exportMaintenanceNotificationPreferenceCsv(csv: string) {
  const filename = `maintenance-notification-preferences-${new Date().toISOString().slice(0, 10)}.csv`;
  try {
    if (Platform.OS === "web") { if (typeof window === "undefined") return { ok: false, message: "CSV export is unavailable in this browser session." }; const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); return { ok: true, message: "Maintenance preference CSV download initiated. Handle email addresses as confidential." }; }
    const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory; if (!directory) return { ok: false, message: "A local export location is unavailable on this device." }; const uri = `${directory}${filename}`; await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 }); if (!(await Sharing.isAvailableAsync())) return { ok: false, message: "CSV was prepared locally, but system sharing is unavailable." }; await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Maintenance notification preferences" }); return { ok: true, message: "Maintenance preference CSV is ready for a deliberate system share or save action." };
  } catch { return { ok: false, message: "The maintenance preference CSV could not be prepared." }; }
}
