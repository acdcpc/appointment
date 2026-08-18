import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { type PediatricAppointment, usePediatricCare } from "@/lib/pediatric-care";

const rescheduleSlots = ["9:00 AM", "10:00 AM", "11:30 AM", "2:00 PM", "3:30 PM"];

export default function AppointmentsTab() {
  const colors = useColors();
  const { appointments, activeChild, rescheduleAppointment } = usePediatricCare();
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const reschedule = (appointment: PediatricAppointment, time: string) => {
    const result = rescheduleAppointment(appointment.id, "Thu, Aug 22", time);
    if (!result.ok) { setMessage(result.message); return; }
    setMessage("Appointment rescheduled successfully.");
    setEditing(null);
  };
  return <ScreenContainer className="p-5"><ScrollView showsVerticalScrollIndicator={false}>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>DR. ANIL OJHA CHILD CARE</Text><Text style={[styles.title, { color: colors.foreground }]}>Appointments</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Schedule and manage {activeChild.name.split(" ")[0]}’s visits with Dr. Ojha.</Text>
    {message ? <Text style={[styles.message, { color: message.includes("successfully") ? colors.success : colors.error }]}>{message}</Text> : null}
    {appointments.map((appointment) => <View key={appointment.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.dot, { backgroundColor: appointment.status === "confirmed" ? colors.success : colors.warning }]} /><View style={{ flex: 1, gap: 4 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{appointment.service}</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>{appointment.date} · {appointment.time}</Text><Text style={[styles.cardMeta, { color: colors.foreground }]}>{appointment.reason}</Text><Text style={[styles.status, { color: appointment.status === "confirmed" ? colors.success : colors.warning }]}>{appointment.status === "needs-intake" ? "Needs intake" : "Confirmed"}</Text></View><Pressable onPress={() => { setEditing(editing === appointment.id ? null : appointment.id); setMessage(""); }} style={[styles.rescheduleButton, { borderColor: colors.primary }]} accessibilityRole="button"><Text style={{ color: colors.primary, fontWeight: "800" }}>Reschedule</Text></Pressable>{editing === appointment.id ? <View style={[styles.reschedulePanel, { borderTopColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Select a new time on Thu, Aug 22</Text><View style={styles.slots}>{rescheduleSlots.map((time) => <Pressable key={time} onPress={() => reschedule(appointment, time)} style={[styles.slot, { borderColor: colors.primary }]}><Text style={{ color: colors.primary, fontWeight: "800" }}>{time}</Text></Pressable>)}</View></View> : null}</View>)}
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, letterSpacing: 1.4, fontWeight: "800", marginTop: 6 }, title: { fontSize: 30, lineHeight: 36, fontWeight: "800", marginTop: 5 }, subtitle: { fontSize: 15, lineHeight: 22, marginTop: 4, marginBottom: 20 }, message: { fontSize: 13, lineHeight: 19, fontWeight: "800", marginBottom: 10 }, card: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10, flexWrap: "wrap" }, dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 }, cardTitle: { fontSize: 15, fontWeight: "800" }, cardMeta: { fontSize: 13, lineHeight: 19 }, status: { fontSize: 11, fontWeight: "800", marginTop: 2 }, rescheduleButton: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 }, reschedulePanel: { width: "100%", borderTopWidth: 1, paddingTop: 14, gap: 10 }, slots: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, slot: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
});

