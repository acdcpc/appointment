import { Pressable, StyleSheet, Text, View } from "react-native";

import { CapacityTargetAlerts } from "@/components/capacity-target-alerts";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export function StaffCapacityAlertWorkspace({ role, onSignOut }: { role: string; onSignOut: () => void }) {
  const colors = useColors(); const label = role === "nurse" ? "Nurse" : role === "receptionist" ? "Reception" : "Clinician";
  return <ScreenContainer className="p-5"><View style={styles.wrap}><Text style={[styles.eyebrow, { color: colors.primary }]}>RAINBOW CHILD DEVELOPMENT CLINIC</Text><Text style={[styles.title, { color: colors.foreground }]}>{label} operational workspace</Text><Text style={[styles.note, { color: colors.muted }]}>Your authenticated staff account can view only the operational capacity alerts the clinic administrator has enabled for this role. This workspace contains no child records, appointment details, or clinical notes.</Text><CapacityTargetAlerts canAcknowledge={false} /><Pressable onPress={onSignOut} style={[styles.signOut, { borderColor: colors.primary }]}><Text style={{ color: colors.primary, fontWeight: "800" }}>Sign out</Text></Pressable></View></ScreenContainer>;
}

const styles = StyleSheet.create({ wrap: { gap: 14 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1 }, title: { fontSize: 24, fontWeight: "800" }, note: { fontSize: 13, lineHeight: 20 }, signOut: { borderWidth: 1, alignItems: "center", borderRadius: 10, padding: 11, marginTop: 6 } });
