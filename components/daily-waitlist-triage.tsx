import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

type TriageFilter = "all" | "pending" | "responses";

export function DailyWaitlistTriage() {
  const colors = useColors();
  const { children, appointments, earlierSlotRequests } = usePediatricCare();
  const [filter, setFilter] = useState<TriageFilter>("all");
  const items = earlierSlotRequests.filter((request) => request.status === "pending" || (request.status === "responded" && request.offer?.parentResponse && !request.offer.clinicianAcknowledgedAt)).filter((request) => filter === "all" || (filter === "pending" ? request.status === "pending" : request.status === "responded"));
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: items.length ? colors.warning : colors.border }]}><Text style={[styles.title, { color: colors.foreground }]}>Daily waitlist triage</Text><Text style={[styles.note, { color: colors.muted }]}>Open work only. Review each item before offering or changing an appointment.</Text><View style={styles.filters}>{(["all", "pending", "responses"] as const).map((value) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, { borderColor: filter === value ? colors.primary : colors.border, backgroundColor: filter === value ? "#E0F2F3" : "transparent" }]}><Text style={{ color: filter === value ? colors.primary : colors.muted, fontWeight: "800", fontSize: 11 }}>{value === "all" ? "All open" : value === "pending" ? "Pending" : "Responses"}</Text></Pressable>)}</View>{items.length ? items.map((request) => { const child = children.find((item) => item.id === request.childId); const appointment = appointments.find((item) => item.id === request.appointmentId); const reason = request.status === "pending" ? "Request awaiting clinician review" : `Guardian ${request.offer?.parentResponse} offer for ${request.offer?.date} · ${request.offer?.time}`; return <View key={request.id} style={[styles.item, { borderColor: colors.border }]}><Text style={[styles.itemTitle, { color: colors.foreground }]}>{child?.name ?? "Child"} · {appointment?.service ?? "Appointment"}</Text><Text style={[styles.note, { color: colors.muted }]}>{reason}</Text><Text style={[styles.note, { color: colors.muted }]}>Current visit: {appointment?.date ?? "—"} · {appointment?.time ?? "—"}</Text></View>; }) : <Text style={[styles.note, { color: colors.success }]}>No open waitlist items match this daily filter.</Text>}</View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 16 }, title: { fontSize: 18, fontWeight: "800" }, note: { fontSize: 12, lineHeight: 18 }, filters: { flexDirection: "row", gap: 7 }, filter: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 8 }, item: { borderTopWidth: 1, paddingTop: 10, gap: 2 }, itemTitle: { fontSize: 13, fontWeight: "800" } });
