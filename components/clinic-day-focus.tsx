import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

export function ClinicDayFocus() {
  const colors = useColors();
  const { appointments, auditEvents } = usePediatricCare();
  const activeVisits = appointments.filter((appointment) => appointment.status !== "cancelled" && appointment.status !== "completed");
  const needsIntake = activeVisits.filter((appointment) => appointment.status === "needs-intake");
  const appointmentChanges = auditEvents.filter((event) => event.type === "appointment-change").slice(0, 3);
  const nextVisit = activeVisits[0];
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.title, { color: colors.foreground }]}>Clinic day focus</Text><Text style={[styles.note, { color: colors.muted }]}>A protected, at-a-glance handoff inspired by leading patient portals: check readiness before opening detailed records.</Text><View style={styles.metrics}><View style={[styles.metric, { backgroundColor: "#E0F2F3" }]}><Text style={[styles.value, { color: colors.primary }]}>{activeVisits.length}</Text><Text style={[styles.label, { color: colors.muted }]}>Active visits</Text></View><View style={[styles.metric, { backgroundColor: needsIntake.length ? "#FFF3CD" : "#EAF7F0" }]}><Text style={[styles.value, { color: needsIntake.length ? colors.warning : colors.success }]}>{needsIntake.length}</Text><Text style={[styles.label, { color: colors.muted }]}>Need intake</Text></View><View style={[styles.metric, { backgroundColor: appointmentChanges.length ? "#FDE7E2" : "#EAF7F0" }]}><Text style={[styles.value, { color: appointmentChanges.length ? colors.error : colors.success }]}>{appointmentChanges.length}</Text><Text style={[styles.label, { color: colors.muted }]}>Recent changes</Text></View></View>{nextVisit ? <View style={[styles.next, { borderColor: colors.border }]}><Text style={[styles.nextLabel, { color: colors.muted }]}>NEXT SCHEDULED VISIT</Text><Text style={[styles.nextTitle, { color: colors.foreground }]}>{nextVisit.date} · {nextVisit.time}</Text><Text style={[styles.note, { color: colors.muted }]}>{nextVisit.service} · {nextVisit.status === "needs-intake" ? "Confirm intake before visit" : "Confirmed"}</Text></View> : <Text style={[styles.note, { color: colors.success }]}>No active appointments are awaiting review.</Text>}</View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 16 }, title: { fontSize: 18, fontWeight: "800" }, note: { fontSize: 12, lineHeight: 18 }, metrics: { flexDirection: "row", gap: 8 }, metric: { flex: 1, borderRadius: 12, padding: 10, gap: 3 }, value: { fontSize: 22, fontWeight: "800" }, label: { fontSize: 11, lineHeight: 15 }, next: { borderWidth: 1, borderRadius: 11, padding: 11, gap: 3 }, nextLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 }, nextTitle: { fontSize: 14, fontWeight: "800" } });
