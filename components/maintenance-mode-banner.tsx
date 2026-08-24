import { StyleSheet, Text, View } from "react-native";
import { trpc } from "@/lib/trpc";

export function MaintenanceModeBanner() {
  const status = trpc.clinicPublic.maintenanceStatus.useQuery(undefined, { refetchInterval: 30_000 });
  if (!status.data?.enabled) return null;
  return <View accessibilityRole="alert" style={styles.banner}><Text style={styles.title}>Maintenance mode</Text><Text style={styles.detail}>{status.data.notice}</Text>{status.data.estimatedCompletion ? <Text style={styles.estimate}>Estimated completion: {status.data.estimatedCompletion}</Text> : null}<Text style={styles.note}>This is an estimate, not a guaranteed restoration time. Access to protected clinic operations is temporarily unavailable; existing appointments are not changed and no message is sent automatically.</Text></View>;
}

const styles = StyleSheet.create({ banner: { backgroundColor: "#FFF4D6", borderBottomWidth: 1, borderBottomColor: "#D99200", paddingHorizontal: 18, paddingVertical: 10, gap: 3 }, title: { color: "#6C4300", fontSize: 14, fontWeight: "900" }, detail: { color: "#6C4300", fontSize: 13, lineHeight: 18 }, estimate: { color: "#6C4300", fontSize: 12, fontWeight: "800" }, note: { color: "#7A5A18", fontSize: 11, lineHeight: 15 } });
