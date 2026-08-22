import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function WeeklyCapacityReportReference({ internalReportId }: { internalReportId: string }) {
  const colors = useColors(); const report = trpc.clinician.getWeeklyCapacitySummaryReportReference.useQuery({ internalReportId }, { retry: false });
  if (report.isLoading) return <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[styles.note, { color: colors.muted }]}>Opening protected internal report reference…</Text></View>;
  if (report.error || !report.data) return <View style={[styles.card, { borderColor: colors.warning, backgroundColor: "#FFF8E8" }]}><Text style={[styles.title, { color: colors.foreground }]}>Internal report reference unavailable</Text><Text style={[styles.note, { color: colors.muted }]}>Sign in with the clinician account that created this report. The QR reference does not provide public access.</Text></View>;
  return <View style={[styles.card, { borderColor: colors.success, backgroundColor: "#F0FFF7" }]}><Text style={[styles.title, { color: colors.foreground }]}>Protected weekly capacity report reference</Text><Text style={[styles.note, { color: colors.foreground }]}>ID: {report.data.internalReportId}</Text><Text style={[styles.note, { color: colors.muted }]}>{report.data.weekStartDate} to {report.data.weekEndDate} · PDF preparation recorded for {report.data.reviewedBy} on {new Date(report.data.reviewedAt).toLocaleString()}.</Text><Text style={[styles.note, { color: colors.muted }]}>This reference confirms protected internal export evidence only; it is not delivery, print, or staff-performance evidence.</Text></View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6, marginTop: 16 }, title: { fontSize: 16, fontWeight: "800" }, note: { fontSize: 12, lineHeight: 18 } });
