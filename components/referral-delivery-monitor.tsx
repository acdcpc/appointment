import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function ReferralDeliveryMonitor() {
  const colors = useColors();
  const [message, setMessage] = useState("");
  const setup = trpc.clinician.configureReferralDeliveryMonitor.useMutation();
  const enable = async () => { setMessage("Configuring the automatic 24-hour referral delivery check…"); try { const result = await setup.mutateAsync(); setMessage(result.nextExecutionAt ? `Automatic monitoring is enabled. Next check: ${result.nextExecutionAt}` : "Automatic monitoring is already enabled for unresolved referrals after 24 hours."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not configure automatic referral monitoring."); } };
  return <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}><View style={styles.heading}><View style={[styles.icon, { backgroundColor: "#FDE8E7" }]}><Text style={{ color: colors.error, fontWeight: "900" }}>!</Text></View><View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.foreground }]}>Automatic referral delivery monitoring</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Checks each hour and notifies the clinician once when a cancelled or unavailable referral remains unresolved for 24 hours.</Text></View></View><Pressable onPress={enable} disabled={setup.isPending} style={[styles.button, { borderColor: colors.primary, opacity: setup.isPending ? 0.6 : 1 }]}>{setup.isPending ? <View style={styles.progress}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: "800" }}>Configuring monitor…</Text></View> : <Text style={{ color: colors.primary, fontWeight: "800" }}>Enable automatic 24-hour check</Text>}</Pressable><Text style={[styles.note, { color: colors.muted }]}>The app must be published before automatic background checks can be enabled.</Text>{message ? <Text style={[styles.message, { color: message.includes("enabled") ? colors.success : message.includes("Configuring") ? colors.primary : colors.error }]}>{message}</Text> : null}</View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 18 }, heading: { flexDirection: "row", gap: 10, alignItems: "flex-start" }, icon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }, title: { fontSize: 16, fontWeight: "800" }, subtitle: { fontSize: 12, lineHeight: 18, marginTop: 2 }, button: { borderWidth: 1, borderRadius: 11, padding: 11, alignItems: "center" }, note: { fontSize: 11, lineHeight: 16 }, message: { fontSize: 12, lineHeight: 18, fontWeight: "700" }, progress: { flexDirection: "row", gap: 8, alignItems: "center" } });
