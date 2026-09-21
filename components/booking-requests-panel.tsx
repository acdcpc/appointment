import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { upcomingClinicDays } from "@/lib/clinic-days";
import {
  buildRescheduleNotice,
  loadAllBookingRequests,
  markBookingRequestNotified,
  rescheduleBookingRequest,
  setBookingRequestStatus,
  summariseBookingRequests,
  type BookingRequest,
} from "@/lib/booking-requests";

/**
 * Clinic view of booked visits.
 *
 * Shows how many are booked, who they are for, how many have already moved, and
 * lets staff move a visit to a later time and tell the parent — by opening the
 * clinic's own WhatsApp with the message ready, so no paid messaging provider is
 * involved, and recording that the parent was informed.
 */
export function BookingRequestsPanel() {
  const colors = useColors();
  const { clinicHours, clinicHolidays, getAvailableSlots, services } = usePediatricCare();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setRequests(await loadAllBookingRequests());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => summariseBookingRequests(requests), [requests]);
  const days = useMemo(() => upcomingClinicDays(5, {
    closedWeekdays: clinicHours.filter((hour) => !hour.isOpen).map((hour) => hour.weekday),
    closedDates: clinicHolidays.map((holiday) => holiday.date),
  }), [clinicHours, clinicHolidays]);

  const serviceFor = (request: BookingRequest) => services.find((item) => item.name === request.service)?.name ?? services[0]?.name ?? "";
  const slotsFor = (request: BookingRequest, date: string) => date ? getAvailableSlots(date, serviceFor(request)) : [];

  const openEditor = (request: BookingRequest) => {
    setEditingId(request.id);
    setNewDate(days[0] ?? request.preferredDate);
    setNewTime("");
    setNote("");
    setMessage("");
  };

  const saveNewTime = async (request: BookingRequest) => {
    if (!newTime) { setMessage("Choose a time for the new appointment."); return; }
    setSaving(true);
    const result = await rescheduleBookingRequest({
      id: request.id,
      date: newDate,
      time: newTime,
      note,
      currentCount: request.rescheduleCount,
      notifyParent: false,
    });
    setMessage(result.message);
    setSaving(false);
    if (result.ok) { setEditingId(null); await load(); }
  };

  const informParent = async (request: BookingRequest) => {
    const text = buildRescheduleNotice(request, request.preferredDate, request.preferredTime);
    const number = request.guardianPhone.replace(/\D/g, "");
    const url = `https://wa.me/${number.startsWith("977") ? number : `977${number}`}?text=${encodeURIComponent(text)}`;
    try {
      await Linking.openURL(url);
      const result = await markBookingRequestNotified(request.id);
      setMessage(result.ok ? `WhatsApp opened with the message for ${request.guardianPhone}. ${result.message}` : result.message);
      await load();
    } catch {
      setMessage("WhatsApp could not be opened. Call the parent instead, then mark this as contacted.");
    }
  };

  const metrics = [
    { label: "Booked visits", value: stats.upcoming },
    { label: "Rescheduled", value: stats.rescheduled },
    { label: "New requests", value: stats.newRequests },
    { label: "Closed", value: stats.closed },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Booked visits</Text>
        <Pressable onPress={load} accessibilityRole="button" style={[styles.refresh, { borderColor: colors.primary }]}>
          <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 13 }}>Refresh</Text>
        </Pressable>
      </View>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Who is booked, for when, and how many visits have already been moved. Staff can move a visit and tell the parent.
      </Text>

      <View style={styles.metricRow}>
        {metrics.map((metric) => (
          <View key={metric.label} style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.primary, fontSize: 24, fontWeight: "900" }}>{metric.value}</Text>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase" }}>{metric.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.muted, marginLeft: 8 }}>Loading bookings…</Text></View>
      ) : requests.length ? requests.map((request) => (
        <View key={request.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 15 }}>
                {request.childName} · {request.childAge} · {request.childSex === "male" ? "Boy" : "Girl"}
              </Text>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "800" }}>
                {request.preferredDate} · {request.preferredTime} · {request.service}
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13 }}>
                {request.guardianPhone}{request.guardianEmail ? ` · ${request.guardianEmail}` : ""}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {[
                  request.weightKg !== undefined ? `${request.weightKg} kg` : null,
                  request.heightCm !== undefined ? `${request.heightCm} cm` : null,
                ].filter(Boolean).join(" · ") || "No weight or height given"}
                {request.rescheduleCount > 0 ? ` · moved ${request.rescheduleCount}×` : ""}
                {request.notifiedAt ? " · parent informed" : ""}
              </Text>
            </View>
            <Text style={{ color: request.status === "new" ? colors.warning : request.status === "closed" ? colors.muted : colors.success, fontWeight: "900", fontSize: 11, textTransform: "uppercase" }}>{request.status}</Text>
          </View>

          {editingId === request.id ? (
            <View style={[styles.editor, { borderTopColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>New day</Text>
              <View style={styles.chipRow}>
                {days.map((day) => (
                  <Pressable key={day} onPress={() => { setNewDate(day); setNewTime(""); }} accessibilityRole="radio" accessibilityState={{ selected: newDate === day }} style={[styles.chip, { borderColor: newDate === day ? colors.primary : colors.border, backgroundColor: newDate === day ? colors.tealSurface : colors.surface }]}>
                    <Text style={{ color: newDate === day ? colors.primary : colors.foreground, fontWeight: "800", fontSize: 12 }}>{day}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>New time</Text>
              <View style={styles.chipRow}>
                {slotsFor(request, newDate).length ? slotsFor(request, newDate).map((slot) => (
                  <Pressable key={slot} onPress={() => setNewTime(slot)} accessibilityRole="radio" accessibilityState={{ selected: newTime === slot }} style={[styles.chip, { borderColor: newTime === slot ? colors.primary : colors.border, backgroundColor: newTime === slot ? colors.primary : colors.surface }]}>
                    <Text style={{ color: newTime === slot ? colors.textInverse : colors.foreground, fontWeight: "900", fontSize: 12 }}>{slot}</Text>
                  </Pressable>
                )) : <Text style={{ color: colors.muted, fontSize: 12 }}>No open times on this day — choose another day or call the parent.</Text>}
              </View>
              <View style={styles.actions}>
                <Pressable onPress={() => saveNewTime(request)} disabled={saving} accessibilityRole="button" style={[styles.action, { backgroundColor: colors.action, borderColor: colors.action, opacity: saving ? 0.7 : 1 }]}>
                  <Text style={{ color: colors.onAction, fontWeight: "900", fontSize: 12 }}>{saving ? "Saving…" : "Save new time"}</Text>
                </Pressable>
                <Pressable onPress={() => setEditingId(null)} accessibilityRole="button" style={[styles.action, { borderColor: colors.border }]}>
                  <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable onPress={() => openEditor(request)} accessibilityRole="button" style={[styles.action, { borderColor: colors.primary }]}>
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>Change the visit time</Text>
              </Pressable>
              <Pressable onPress={() => informParent(request)} accessibilityRole="button" style={[styles.action, { borderColor: colors.success }]}>
                <Text style={{ color: colors.success, fontWeight: "800", fontSize: 12 }}>Inform the parent</Text>
              </Pressable>
              {(["contacted", "closed"] as const).map((status) => (
                <Pressable key={status} onPress={async () => { await setBookingRequestStatus(request.id, status); await load(); }} accessibilityRole="button" style={[styles.action, { borderColor: colors.border }]}>
                  <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}>Mark {status}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )) : (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "800" }}>No bookings yet</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>A booking appears here as soon as a parent books a visit with the child’s details.</Text>
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
  metricRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metric: { flex: 1, minWidth: 110, borderWidth: 1, borderRadius: 14, padding: 12, gap: 2 },
  loading: { flexDirection: "row", alignItems: "center" },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  cardHead: { flexDirection: "row", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  editor: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, minHeight: 40, justifyContent: "center" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  action: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, minHeight: 40, justifyContent: "center" },
});
