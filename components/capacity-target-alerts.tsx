import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function CapacityTargetAlerts() {
  const colors = useColors(); const alerts = trpc.clinician.listCapacityTargetChangeAlerts.useQuery(undefined, { retry: false }); const acknowledge = trpc.clinician.acknowledgeCapacityTargetChangeAlert.useMutation({ onSuccess: () => { void alerts.refetch(); } }); const pending = (alerts.data ?? []).filter((item) => !item.acknowledgedAt).sort((left, right) => Date.parse(right.changedAt) - Date.parse(left.changedAt));
  if (alerts.isLoading || !pending.length) return null;
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.warning }]}><Text style={[styles.title, { color: colors.foreground }]}>Capacity target alerts ({pending.length})</Text><Text style={[styles.note, { color: colors.muted }]}>Immediate operational notices. They guide workload distribution and do not evaluate staff performance.</Text>{pending.map((alert) => <View key={alert.id} style={[styles.row, { borderColor: colors.border }]}><View style={{ flex: 1, gap: 2 }}><Text style={[styles.name, { color: colors.foreground }]}>{alert.staffName}: {alert.previousTarget} → {alert.newTarget} open items</Text><Text style={[styles.note, { color: colors.muted }]}>{alert.changedBy} · {new Date(alert.changedAt).toLocaleString()}</Text></View><Pressable onPress={() => acknowledge.mutate({ alertId: alert.alertId })} disabled={acknowledge.isPending} style={[styles.acknowledge, { borderColor: colors.primary }]}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800" }}>Acknowledge</Text></Pressable></View>)}</View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 9, marginTop: 16 }, title: { fontSize: 17, fontWeight: "800" }, note: { fontSize: 12, lineHeight: 17 }, row: { borderTopWidth: 1, paddingTop: 9, flexDirection: "row", gap: 9, alignItems: "center" }, name: { fontSize: 13, fontWeight: "800" }, acknowledge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8 } });
