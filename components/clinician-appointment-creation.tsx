import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

const today = new Date().toISOString().slice(0, 10);

/** Owner-only form. The surrounding dashboard is protected by clinician admin access. */
export function ClinicianAppointmentCreation() {
  const colors = useColors();
  const { children, services, getAvailableSlots, bookAppointment } = usePediatricCare();
  const [childId, setChildId] = useState(children[0]?.id ?? "");
  const [service, setService] = useState(services[0]?.name ?? "");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const slots = useMemo(() => date.trim() && service ? getAvailableSlots(date.trim(), service) : [], [date, getAvailableSlots, service]);

  const create = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) { setMessage("Enter the appointment date as YYYY-MM-DD."); return; }
    if (!time) { setMessage("Select an available appointment time."); return; }
    const result = bookAppointment({ childId, service, date: date.trim(), time, reason: reason.trim() });
    if (!result.ok) { setMessage(result.message); return; }
    setReason(""); setTime(""); setMessage("Appointment created. It will be saved to the protected clinician schedule.");
  };

  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.title, { color: colors.foreground }]}>Create scheduled visit</Text>
    <Text style={[styles.note, { color: colors.muted }]}>Only a signed-in clinician administrator can create this appointment. Availability is checked against clinic hours, breaks, holidays, and active visits before it is added.</Text>
    <Text style={[styles.label, { color: colors.foreground }]}>Child record</Text><View style={styles.options}>{children.map((child) => <Pressable key={child.id} accessibilityRole="button" accessibilityLabel={`Select ${child.name}`} onPress={() => setChildId(child.id)} style={[styles.option, { borderColor: childId === child.id ? colors.primary : colors.border, backgroundColor: childId === child.id ? "#E0F2F3" : colors.surface }]}><Text style={{ color: childId === child.id ? colors.primary : colors.muted, fontWeight: "800" }}>{child.name}</Text></Pressable>)}</View>
    <Text style={[styles.label, { color: colors.foreground }]}>Service</Text><View style={styles.options}>{services.map((item) => <Pressable key={item.name} accessibilityRole="button" accessibilityLabel={`Select ${item.name}`} onPress={() => { setService(item.name); setTime(""); }} style={[styles.option, { borderColor: service === item.name ? colors.primary : colors.border, backgroundColor: service === item.name ? "#E0F2F3" : colors.surface }]}><Text style={{ color: service === item.name ? colors.primary : colors.muted, fontWeight: "800" }}>{item.name} · {item.durationMinutes} min</Text></Pressable>)}</View>
    <Text style={[styles.label, { color: colors.foreground }]}>Appointment date</Text><TextInput value={date} onChangeText={(value) => { setDate(value); setTime(""); }} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} accessibilityLabel="Appointment date in year month day format" style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
    <Text style={[styles.label, { color: colors.foreground }]}>Available time</Text><View style={styles.options}>{slots.map((slot) => <Pressable key={slot} accessibilityRole="button" accessibilityLabel={`Select ${slot}`} onPress={() => setTime(slot)} style={[styles.option, { borderColor: time === slot ? colors.primary : colors.border, backgroundColor: time === slot ? "#E0F2F3" : colors.surface }]}><Text style={{ color: time === slot ? colors.primary : colors.muted, fontWeight: "800" }}>{slot}</Text></Pressable>)}</View>{date.trim() && !slots.length ? <Text style={[styles.note, { color: colors.warning }]}>No available times are currently shown for this date and service.</Text> : null}
    <Text style={[styles.label, { color: colors.foreground }]}>Reason for visit</Text><TextInput value={reason} onChangeText={setReason} placeholder="Clinician-recorded scheduling reason" placeholderTextColor={colors.muted} accessibilityLabel="Reason for visit" multiline style={[styles.reason, { color: colors.foreground, borderColor: colors.border }]} />
    {message ? <Text style={[styles.message, { color: message.includes("created") ? colors.success : colors.error }]}>{message}</Text> : null}<Pressable accessibilityRole="button" accessibilityLabel="Create protected scheduled visit" onPress={create} style={[styles.submit, { backgroundColor: colors.primary }]}><Text style={styles.submitText}>Create scheduled visit</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 8, marginTop: 10 }, title: { fontSize: 16, fontWeight: "800" }, note: { fontSize: 13, lineHeight: 19 }, label: { fontSize: 13, fontWeight: "800", marginTop: 5 }, options: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, option: { minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 9, justifyContent: "center" }, input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }, reason: { minHeight: 80, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, textAlignVertical: "top" }, message: { fontSize: 13, lineHeight: 19, fontWeight: "800" }, submit: { minHeight: 50, borderRadius: 14, padding: 14, alignItems: "center", justifyContent: "center", marginTop: 2 }, submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" } });
