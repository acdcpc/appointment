import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { loadAllBookingRequests, setBookingRequestStatus, type BookingRequest } from "@/lib/booking-requests";

/**
 * Booking requests, with the child identification the parent supplied.
 *
 * Parents book with the child’s name, age, sex, optional weight and height, and
 * a contact number. This is where the clinic sees that, and triages it.
 */
export function BookingRequestsPanel() {
  const colors = useColors();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const rows = await loadAllBookingRequests();
    setRequests(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: number, status: BookingRequest["status"]) => {
    const result = await setBookingRequestStatus(id, status);
    setMessage(result.ok ? `Request #${id} ${result.message}` : result.message);
    if (result.ok) await load();
  };

  const statusColour = (status: BookingRequest["status"]) => status === "new" ? colors.warning : status === "closed" ? colors.muted : colors.success;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Booking requests</Text>
        <Pressable onPress={load} accessibilityRole="button" style={[styles.refresh, { borderColor: colors.primary }]}>
          <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 13 }}>Refresh</Text>
        </Pressable>
      </View>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Details a parent gave when booking: child’s name, age, sex, optional weight and height, contact number and email.
      </Text>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.muted, marginLeft: 8 }}>Loading requests…</Text></View>
      ) : requests.length ? requests.map((request) => (
        <View key={request.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 15 }}>
                {request.childName} · {request.childAge} · {request.childSex === "male" ? "Boy" : "Girl"}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {[
                  request.weightKg !== undefined ? `${request.weightKg} kg` : null,
                  request.heightCm !== undefined ? `${request.heightCm} cm` : null,
                ].filter(Boolean).join(" · ") || "No weight or height given"}
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13 }}>
                {request.guardianPhone}{request.guardianEmail ? ` · ${request.guardianEmail}` : ""}
              </Text>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>
                {request.service} · {request.preferredDate} · {request.preferredTime}
              </Text>
            </View>
            <Text style={{ color: statusColour(request.status), fontWeight: "900", fontSize: 11, textTransform: "uppercase" }}>{request.status}</Text>
          </View>
          <View style={styles.actions}>
            {(["contacted", "scheduled", "closed"] as const).map((status) => (
              <Pressable key={status} onPress={() => update(request.id, status)} accessibilityRole="button" style={[styles.action, { borderColor: colors.primary }]}>
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>Mark {status}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )) : (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "800" }}>No booking requests yet</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>A request appears here as soon as a parent books a visit with the child’s details.</Text>
        </View>
      )}
      {message ? <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "800" }}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  title: { fontSize: 18, fontWeight: "800", flex: 1 },
  refresh: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 44, justifyContent: "center" },
  subtitle: { fontSize: 13, lineHeight: 19 },
  loading: { flexDirection: "row", alignItems: "center" },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  cardHead: { flexDirection: "row", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  action: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, minHeight: 40, justifyContent: "center" },
});
