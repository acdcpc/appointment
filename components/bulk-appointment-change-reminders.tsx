import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

export function BulkAppointmentChangeReminders() {
  const colors = useColors(); const { appointments, children, recordAppointmentChangeReminderDraft } = usePediatricCare(); const [message, setMessage] = useState(""); const threshold = 24 * 60 * 60 * 1000;
  const overdue = appointments.filter((item) => item.changeMessage && item.rescheduledAt && !item.rescheduleAcknowledgedAt && !item.appointmentChangeReminderDraftedAt && item.status !== "cancelled" && Date.now() - Date.parse(item.rescheduledAt) >= threshold);
  const prepare = () => { let prepared = 0; overdue.forEach((appointment) => { if (recordAppointmentChangeReminderDraft(appointment.id).ok) prepared += 1; }); setMessage(prepared ? `${prepared} clinician-reviewed reminder draft${prepared === 1 ? "" : "s"} prepared. No messages were sent.` : "No eligible appointment-change reminders remain."); };
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: overdue.length ? colors.warning : colors.border }]}><Text style={[styles.title, { color: colors.foreground }]}>Bulk appointment-change follow-up</Text><Text style={[styles.note, { color: colors.muted }]}>Review the overdue queue before preparing drafts. This action never sends SMS or email.</Text>{overdue.length ? <><View style={styles.list}>{overdue.map((appointment) => <Text key={appointment.id} style={[styles.note, { color: colors.foreground }]}>• {children.find((child) => child.id === appointment.childId)?.name ?? "Child"} · {appointment.date} · {appointment.time}</Text>)}</View><Pressable onPress={prepare} style={[styles.button, { backgroundColor: colors.warning }]}><Text style={styles.buttonText}>Review & prepare {overdue.length} draft{overdue.length === 1 ? "" : "s"}</Text></Pressable></> : <Text style={[styles.note, { color: colors.success }]}>No overdue, unacknowledged appointment changes are awaiting review.</Text>}{message ? <Text style={[styles.note, { color: message.includes("prepared") ? colors.success : colors.muted }]}>{message}</Text> : null}</View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 16 }, title: { fontSize: 18, fontWeight: "800" }, note: { fontSize: 12, lineHeight: 18 }, list: { gap: 3 }, button: { borderRadius: 9, paddingVertical: 10, alignItems: "center" }, buttonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" } });
