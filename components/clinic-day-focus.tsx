import { Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import { PatientContactPanel } from "@/components/patient-contact-panel";
import { loadAllBookingRequests, type BookingRequest } from "@/lib/booking-requests";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

type FocusView = "visits" | "intake" | "changes";

/**
 * Clinic day focus.
 *
 * This card used to show four bare numbers, which told the clinic nothing: an
 * "active visits 3" tile did not say who those three families were, and "recent
 * changes 1" did not say what had changed. Every count is now backed by the
 * list behind it, and each tile switches to that list.
 */
export function ClinicDayFocus() {
  const colors = useColors();
  const { appointments, auditEvents, earlierSlotRequests, children } = usePediatricCare();
  const [view, setView] = useState<FocusView>("visits");
  // Tapping a patient's name opens their information and the message box. The
  // family's contact details come from the booking the parent submitted.
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  useEffect(() => {
    let cancelled = false;
    loadAllBookingRequests().then((rows) => { if (!cancelled) setRequests(rows); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const requestFor = (childName: string) => requests.find((request) => request.childName.trim().toLowerCase() === childName.trim().toLowerCase());

  const nameFor = (childId: string, reason?: string) => {
    const known = children.find((child) => child.id === childId)?.name;
    if (known) return known;
    // Bookings record the child's name in the reason field, e.g. "Aarav Smith · 4 years 2 months".
    const fromReason = reason?.split("·")[0]?.trim();
    return fromReason && fromReason.length > 1 ? fromReason : "Child record";
  };

  const activeVisits = appointments
    .filter((appointment) => appointment.status !== "cancelled" && appointment.status !== "completed")
    .sort((left, right) => left.date.localeCompare(right.date) || left.time.localeCompare(right.time));
  const needsIntake = activeVisits.filter((appointment) => appointment.status === "needs-intake");
  const guardianConfirmed = activeVisits.filter((appointment) => Boolean(appointment.guardianConfirmedAt));
  const changes = auditEvents.filter((event) => event.type === "appointment-change").slice(0, 5);
  const pendingWaitlistResponses = earlierSlotRequests.filter((request) => request.status === "responded" && request.offer?.parentResponse && !request.offer?.clinicianAcknowledgedAt);

  const tiles: Array<{ id: FocusView; value: number; label: string }> = [
    { id: "visits", value: activeVisits.length, label: "Active visits" },
    { id: "intake", value: needsIntake.length, label: "Need intake" },
    { id: "changes", value: changes.length, label: "Recent changes" },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Clinic day focus</Text>
      <Text style={[styles.note, { color: colors.muted }]}>Tap a tile to see exactly who it refers to.</Text>

      <View style={styles.metrics}>
        {tiles.map((tile) => {
          const selected = view === tile.id;
          return (
            <Pressable
              key={tile.id}
              onPress={() => setView(tile.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.metric, { backgroundColor: selected ? colors.tealSurface : colors.background, borderWidth: 1, borderColor: selected ? colors.primary : colors.border }]}
            >
              <Text style={[styles.value, { color: selected ? colors.primary : colors.foreground }]}>{tile.value}</Text>
              <Text style={[styles.label, { color: colors.muted }]}>{tile.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {view === "visits" ? (
        activeVisits.length ? activeVisits.map((appointment) => (
          <View key={appointment.id} style={[styles.rowWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Pressable onPress={() => setOpenRow(openRow === appointment.id ? null : appointment.id)} accessibilityRole="button" accessibilityLabel={`Open patient information for ${nameFor(appointment.childId, appointment.reason)}`} style={styles.rowInner}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 14 }}>{nameFor(appointment.childId, appointment.reason)} <Text style={{ color: colors.primary, fontSize: 12 }}>{openRow === appointment.id ? "▲" : "· tap for patient details"}</Text></Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{appointment.date} · {appointment.time} · {appointment.service} · {appointment.durationMinutes} min</Text>
              {appointment.changeMessage ? <Text style={{ color: colors.warning, fontSize: 12, fontWeight: "800" }}>{appointment.changeMessage}</Text> : null}
            </View>
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              <Text style={{ color: appointment.status === "needs-intake" ? colors.warning : colors.success, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>
                {appointment.status === "needs-intake" ? "Needs intake" : "Confirmed"}
              </Text>
              <Text style={{ color: appointment.guardianConfirmedAt ? colors.success : colors.muted, fontSize: 11, fontWeight: "800" }}>
                {appointment.guardianConfirmedAt ? "Guardian confirmed" : "Awaiting guardian"}
              </Text>
            </View>
            </Pressable>
            {openRow === appointment.id ? (() => {
              const request = requestFor(nameFor(appointment.childId, appointment.reason));
              return (
                <PatientContactPanel
                  contact={{
                    childName: nameFor(appointment.childId, appointment.reason),
                    childAge: request?.childAge,
                    childSex: request?.childSex,
                    weightKg: request?.weightKg,
                    heightCm: request?.heightCm,
                    phone: request?.guardianPhone,
                    email: request?.guardianEmail,
                    visitLabel: `${appointment.date} · ${appointment.time} · ${appointment.service}`,
                  }}
                />
              );
            })() : null}
          </View>
        )) : <Text style={{ color: colors.muted, fontSize: 13 }}>No active visits right now.</Text>
      ) : null}

      {view === "intake" ? (
        needsIntake.length ? needsIntake.map((appointment) => (
          <View key={appointment.id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 14 }}>{nameFor(appointment.childId, appointment.reason)}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{appointment.date} · {appointment.time} · {appointment.service}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Still needs intake before the visit.</Text>
            </View>
          </View>
        )) : <Text style={{ color: colors.muted, fontSize: 13 }}>Nothing is waiting for intake.</Text>
      ) : null}

      {view === "changes" ? (
        changes.length ? changes.map((event) => (
          <View key={event.id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 14 }}>{nameFor(event.childId)}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{event.summary}</Text>
              {event.message ? <Text style={{ color: colors.muted, fontSize: 12 }}>{event.message}</Text> : null}
            </View>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>{event.occurredOn}</Text>
          </View>
        )) : <Text style={{ color: colors.muted, fontSize: 13 }}>No appointment changes recorded.</Text>
      ) : null}

      {activeVisits[0] ? (
        <View style={[styles.row, { borderColor: colors.primary, backgroundColor: colors.tealSurface }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }}>NEXT SCHEDULED VISIT</Text>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "900" }}>
              {nameFor(activeVisits[0].childId, activeVisits[0].reason)}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {activeVisits[0].date} · {activeVisits[0].time} · {activeVisits[0].service}
            </Text>
            <Text style={{ color: activeVisits[0].status === "needs-intake" ? colors.warning : colors.success, fontSize: 12, fontWeight: "800" }}>
              {activeVisits[0].status === "needs-intake" ? "Confirm intake before visit" : "Intake complete — ready for the visit"}
            </Text>
          </View>
        </View>
      ) : null}

      {guardianConfirmed.length ? (
        <Text style={{ color: colors.success, fontSize: 12, fontWeight: "800" }}>
          {guardianConfirmed.map((appointment) => `${nameFor(appointment.childId, appointment.reason)} — ${appointment.date} at ${appointment.time}`).join(" · ")} confirmed by the guardian.
        </Text>
      ) : null}
      {pendingWaitlistResponses.length ? (
        <Text style={{ color: colors.warning, fontSize: 12, fontWeight: "800" }}>
          {pendingWaitlistResponses.length} earlier-slot response{pendingWaitlistResponses.length === 1 ? "" : "s"} waiting for the clinic to acknowledge.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 16 },
  title: { fontSize: 18, fontWeight: "800" },
  note: { fontSize: 12, lineHeight: 18 },
  metrics: { flexDirection: "row", gap: 8 },
  metric: { flex: 1, borderRadius: 12, padding: 10, gap: 3 },
  value: { fontSize: 22, fontWeight: "800" },
  label: { fontSize: 11, lineHeight: 15 },
  row: { borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: "row", gap: 10, alignItems: "flex-start", flexWrap: "wrap" },
  rowWrap: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  rowInner: { flexDirection: "row", gap: 10, alignItems: "flex-start", flexWrap: "wrap" },
});
