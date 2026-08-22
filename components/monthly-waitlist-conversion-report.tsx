import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

export function MonthlyWaitlistConversionReport() {
  const colors = useColors(); const { earlierSlotRequests } = usePediatricCare(); const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0); const stamp = start.getTime();
  const offers = earlierSlotRequests.filter((item) => item.offer && Date.parse(item.offer.offeredAt) >= stamp); const accepted = offers.filter((item) => item.offer?.parentResponse === "accepted").length; const converted = offers.filter((item) => item.status === "converted").length; const declined = offers.filter((item) => item.offer?.parentResponse === "declined").length; const expired = earlierSlotRequests.filter((item) => item.status === "expired" && item.offer && Date.parse(item.offer.expiresAt) >= stamp).length; const rate = offers.length ? Math.round((converted / offers.length) * 100) : 0;
  const metrics = [["Offered", offers.length, colors.primary], ["Accepted", accepted, colors.success], ["Converted", converted, colors.success], ["Declined", declined, colors.error], ["Expired", expired, colors.warning]] as const;
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.title, { color: colors.foreground }]}>Monthly waitlist conversion</Text><Text style={[styles.note, { color: colors.muted }]}>Aggregate operational activity for {start.toLocaleString(undefined, { month: "long", year: "numeric" })}. No patient identifiers are shown.</Text><View style={styles.metrics}>{metrics.map(([label, value, color]) => <View key={label} style={[styles.metric, { borderColor: colors.border }]}><Text style={[styles.value, { color }]}>{value}</Text><Text style={[styles.label, { color: colors.muted }]}>{label}</Text></View>)}</View><Text style={[styles.rate, { color: colors.foreground }]}>{rate}% offer-to-reschedule conversion</Text></View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 16 }, title: { fontSize: 18, fontWeight: "800" }, note: { fontSize: 12, lineHeight: 18 }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, metric: { minWidth: 78, flexGrow: 1, borderWidth: 1, borderRadius: 10, padding: 9, gap: 2 }, value: { fontSize: 20, fontWeight: "800" }, label: { fontSize: 11, fontWeight: "700" }, rate: { fontSize: 13, fontWeight: "800" } });
