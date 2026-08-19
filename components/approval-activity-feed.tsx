import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

export function ApprovalActivityFeed() {
  const colors = useColors();
  const { referralServices } = usePediatricCare();
  const activity = referralServices.filter((service) => service.approvalStatus !== "pending" && service.decisionBy && service.decisionAt).sort((a, b) => Date.parse(b.decisionAt ?? "") - Date.parse(a.decisionAt ?? "")).slice(0, 6);
  return <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[styles.title, { color: colors.foreground }]}>Approval activity</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Recent clinician decisions on specialist contact records.</Text>{activity.map((service) => <View key={service.id} style={[styles.item, { borderColor: colors.border }]}><View style={[styles.identity, { backgroundColor: service.approvalStatus === "approved" ? "#E4F5E8" : "#FDE8E7" }]}><Text style={{ color: service.approvalStatus === "approved" ? colors.success : colors.error, fontWeight: "900" }}>{service.approvalStatus === "approved" ? "✓" : "×"}</Text></View><View style={{ flex: 1, gap: 2 }}><Text style={[styles.itemTitle, { color: colors.foreground }]}>{service.decisionBy} {service.approvalStatus} {service.name}</Text><Text style={[styles.itemMeta, { color: colors.muted }]}>{service.recipient} · {service.email}</Text><Text style={[styles.itemMeta, { color: colors.muted }]}>Recorded {service.decisionAt}</Text></View></View>)}{!activity.length ? <Text style={[styles.empty, { color: colors.muted }]}>No staff approval actions have been recorded yet.</Text> : null}</View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 9, marginTop: 18 }, title: { fontSize: 17, fontWeight: "800" }, subtitle: { fontSize: 12, lineHeight: 18 }, item: { borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: "row", gap: 9, alignItems: "flex-start" }, identity: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" }, itemTitle: { fontSize: 13, fontWeight: "800", lineHeight: 18 }, itemMeta: { fontSize: 11, lineHeight: 16 }, empty: { fontSize: 12, lineHeight: 18 } });
