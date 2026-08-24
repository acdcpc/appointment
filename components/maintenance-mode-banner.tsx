import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { maintenanceCountdownLabel } from "@/lib/maintenance-countdown";
import { trpc } from "@/lib/trpc";

export function MaintenanceModeBanner() {
  const status = trpc.clinicPublic.maintenanceStatus.useQuery(undefined, { refetchInterval: 30_000 });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!status.data?.enabled || !status.data.estimatedCompletionAt) return; const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, [status.data?.enabled, status.data?.estimatedCompletionAt]);
  if (!status.data?.enabled) return null;
  const countdown = maintenanceCountdownLabel(status.data.estimatedCompletionAt, now);
  return <View accessibilityRole="alert" style={styles.banner}><Text style={styles.title}>Maintenance mode</Text><Text style={styles.detail}>{status.data.notice}</Text>{status.data.estimatedCompletion ? <Text style={styles.estimate}>Estimated completion: {status.data.estimatedCompletion}</Text> : null}{countdown ? <Text style={styles.countdown}>{countdown}</Text> : null}<Text style={styles.note}>The countdown is based only on the super-admin’s estimate. It does not guarantee restoration, change appointments, or send messages automatically.</Text></View>;
}

const styles = StyleSheet.create({ banner: { backgroundColor: "#FFF4D6", borderBottomWidth: 1, borderBottomColor: "#D99200", paddingHorizontal: 18, paddingVertical: 10, gap: 3 }, title: { color: "#6C4300", fontSize: 14, fontWeight: "900" }, detail: { color: "#6C4300", fontSize: 13, lineHeight: 18 }, estimate: { color: "#6C4300", fontSize: 12, fontWeight: "800" }, countdown: { color: "#8A3F00", fontSize: 12, lineHeight: 17, fontWeight: "900" }, note: { color: "#7A5A18", fontSize: 11, lineHeight: 15 } });
