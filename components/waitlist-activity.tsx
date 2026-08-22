import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

function activityCopy(status: string, response?: "accepted" | "declined", isExpired?: boolean) {
  if (isExpired) return "Earlier-slot offer expired without a recorded parent response.";
  if (response === "accepted") return "Parent accepted the earlier-slot offer; clinician follow-up is required before any booking change.";
  if (response === "declined") return "Parent declined the earlier-slot offer; the current appointment remains unchanged.";
  if (status === "offered") return "Clinician-approved earlier-slot offer drafted for a confirmed guardian.";
  if (status === "withdrawn") return "Parent withdrew the earlier-slot request.";
  if (status === "declined") return "Clinician closed the earlier-slot request.";
  return "Earlier-slot request submitted for clinician review.";
}

export function WaitlistActivity() {
  const colors = useColors();
  const { children, earlierSlotRequests, acknowledgeEarlierSlotResponse } = usePediatricCare();
  const now = Date.now();
  const responses = earlierSlotRequests.filter((request) => request.status === "responded" && request.offer?.parentResponse && !request.offer.clinicianAcknowledgedAt);
  const activity = [...earlierSlotRequests].sort((left, right) => Date.parse(right.offer?.respondedAt ?? right.offer?.offeredAt ?? right.requestedAt) - Date.parse(left.offer?.respondedAt ?? left.offer?.offeredAt ?? left.requestedAt)).slice(0, 8);
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: responses.length ? colors.warning : colors.border }]}><View style={styles.heading}><View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.foreground }]}>Waitlist activity</Text><Text style={[styles.note, { color: colors.muted }]}>Clinician-only history of requests, offers, expiry, and guardian decisions. No response changes an appointment automatically.</Text></View>{responses.length ? <View style={[styles.badge, { backgroundColor: "#FFF3CD", borderColor: colors.warning }]}><Text style={{ color: colors.warning, fontWeight: "800", fontSize: 12 }}>{responses.length} response{responses.length === 1 ? "" : "s"}</Text></View> : null}</View>{responses.length ? <View style={[styles.alert, { backgroundColor: "#FFF8EB", borderColor: colors.warning }]}><Text style={[styles.alertTitle, { color: colors.foreground }]}>Guardian offer response needs review</Text>{responses.map((request) => { const child = children.find((item) => item.id === request.childId); return <View key={request.id} style={styles.alertRow}><Text style={[styles.note, { color: colors.muted, flex: 1 }]}>{child?.name ?? "Child"} {request.offer?.parentResponse === "accepted" ? "accepted" : "declined"} the offer for {request.offer?.date} · {request.offer?.time}.</Text><Pressable onPress={() => acknowledgeEarlierSlotResponse(request.id)} style={[styles.acknowledge, { backgroundColor: colors.primary }]}><Text style={styles.acknowledgeText}>Acknowledge</Text></Pressable></View>; })}</View> : null}{activity.length ? activity.map((request) => { const child = children.find((item) => item.id === request.childId); const expired = request.status === "expired" || (request.status === "offered" && !!request.offer && Date.parse(request.offer.expiresAt) <= now); const timestamp = request.offer?.respondedAt ?? request.offer?.offeredAt ?? request.requestedAt; return <View key={request.id} style={[styles.item, { borderColor: colors.border }]}><Text style={[styles.itemTitle, { color: colors.foreground }]}>{child?.name ?? "Child"} · {request.offer?.date && request.offer?.time ? `${request.offer.date} · ${request.offer.time}` : "Earlier-slot request"}</Text><Text style={[styles.note, { color: colors.muted }]}>{activityCopy(request.status, request.offer?.parentResponse, expired)}</Text><Text style={[styles.timestamp, { color: colors.muted }]}>{new Date(timestamp).toLocaleString()}</Text></View>; }) : <Text style={[styles.note, { color: colors.success }]}>No waitlist activity has been recorded yet.</Text>}</View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 22 }, heading: { flexDirection: "row", gap: 10, alignItems: "flex-start" }, title: { fontSize: 18, fontWeight: "800" }, note: { fontSize: 12, lineHeight: 18 }, badge: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 }, alert: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 }, alertTitle: { fontSize: 13, fontWeight: "800" }, alertRow: { flexDirection: "row", gap: 8, alignItems: "center" }, acknowledge: { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9 }, acknowledgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 11 }, item: { borderTopWidth: 1, paddingTop: 10, gap: 3 }, itemTitle: { fontSize: 13, fontWeight: "800" }, timestamp: { fontSize: 10, marginTop: 1 } });
