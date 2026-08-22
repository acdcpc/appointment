import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

export function WeeklyWaitlistSummary() {
  const colors = useColors();
  const { earlierSlotRequests } = usePediatricCare();
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const offered = earlierSlotRequests.filter((request) => request.offer && Date.parse(request.offer.offeredAt) >= weekStart).length;
  const accepted = earlierSlotRequests.filter((request) => request.offer?.parentResponse === "accepted" && request.offer.respondedAt && Date.parse(request.offer.respondedAt) >= weekStart).length;
  const expired = earlierSlotRequests.filter((request) => request.status === "expired" && request.offer && Date.parse(request.offer.expiresAt) >= weekStart).length;
  const values = [{ label: "Offered", value: offered, color: colors.primary }, { label: "Accepted", value: accepted, color: colors.success }, { label: "Expired", value: expired, color: colors.warning }]; const max = Math.max(1, ...values.map((item) => item.value));
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.title, { color: colors.foreground }]}>Weekly waitlist status</Text><Text style={[styles.note, { color: colors.muted }]}>Aggregate activity for the last seven days. Counts do not include parent or child identifiers.</Text><View style={styles.chart}>{values.map((item) => <View key={item.label} style={styles.barGroup}><View style={[styles.track, { backgroundColor: "#EAF0F4" }]}><View style={[styles.bar, { backgroundColor: item.color, height: `${Math.max(8, (item.value / max) * 100)}%` }]} /></View><Text style={[styles.value, { color: colors.foreground }]}>{item.value}</Text><Text style={[styles.label, { color: colors.muted }]}>{item.label}</Text></View>)}</View></View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 16 }, title: { fontSize: 18, fontWeight: "800" }, note: { fontSize: 12, lineHeight: 18 }, chart: { height: 142, flexDirection: "row", alignItems: "flex-end", gap: 18, paddingTop: 8 }, barGroup: { flex: 1, alignItems: "center", gap: 5 }, track: { width: 38, height: 88, borderRadius: 10, justifyContent: "flex-end", overflow: "hidden" }, bar: { width: "100%", borderRadius: 10 }, value: { fontSize: 18, fontWeight: "800" }, label: { fontSize: 11, fontWeight: "700" } });
