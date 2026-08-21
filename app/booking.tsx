import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

const dates = ["Tue, Aug 20", "Wed, Aug 21", "Thu, Aug 22"];

export default function BookingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeChild, services, getAvailableSlots, bookAppointment } = usePediatricCare();
  const [service, setService] = useState(services[0].name);
  const [date, setDate] = useState(dates[0]);
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const availableSlots = getAvailableSlots(date, service);
  const selectService = (name: string) => { setService(name); setTime(getAvailableSlots(date, name)[0] ?? ""); setMessage(""); };
  const selectDate = (nextDate: string) => { setDate(nextDate); setTime(getAvailableSlots(nextDate, service)[0] ?? ""); setMessage(""); };
  const handleBooking = () => {
    if (!time) { setMessage("Choose an available appointment time before confirming."); return; }
    const result = bookAppointment({ childId: activeChild.id, service, date, time, reason: reason.trim() || "Parent requested appointment" });
    if (!result.ok) { setMessage(result.message); return; }
    router.replace("/(tabs)/appointments");
  };

  return <ScreenContainer className="p-5"><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={[styles.back, { color: colors.primary }]}>‹  Back</Text></Pressable>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>RAINBOW CHILD DEVELOPMENT CLINIC</Text><Text style={[styles.title, { color: colors.foreground }]}>Book an appointment</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Available times follow clinic hours configured by Associate Professor Dr. Anil Ojha, MBBS, MD, FCCH, Developmental Pediatrician. Help: 9765002862</Text>
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Patient</Text><View style={[styles.childCard, { backgroundColor: "#E0F2F3", borderColor: colors.primary }]}><View style={[styles.initials, { backgroundColor: colors.primary }]}><Text style={styles.initialsText}>{activeChild.name.split(" ").map((part) => part[0]).join("")}</Text></View><View><Text style={[styles.cardTitle, { color: colors.foreground }]}>{activeChild.name}</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>Parent or guardian: {activeChild.parentName}</Text></View></View>
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Visit type</Text>{services.map((item) => <Pressable key={item.name} onPress={() => selectService(item.name)} style={[styles.option, { borderColor: service === item.name ? colors.primary : colors.border, backgroundColor: service === item.name ? "#E0F2F3" : colors.surface }]}><View><Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>{item.durationMinutes} minutes</Text></View><Text style={{ color: service === item.name ? colors.primary : colors.muted, fontWeight: "800" }}>{service === item.name ? "Selected" : "Select"}</Text></Pressable>)}
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Preferred day</Text><View style={styles.dateRow}>{dates.map((item) => <Pressable key={item} onPress={() => selectDate(item)} style={[styles.date, { borderColor: date === item ? colors.primary : colors.border, backgroundColor: date === item ? "#E0F2F3" : colors.surface }]}><Text style={[styles.dateDay, { color: colors.muted }]}>{item.split(", ")[0]}</Text><Text style={[styles.dateNumber, { color: colors.foreground }]}>{item.split(" ").at(-1)}</Text></Pressable>)}</View>
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available time</Text>{availableSlots.length ? <View style={styles.slotGrid}>{availableSlots.map((item) => <Pressable key={item} onPress={() => { setTime(item); setMessage(""); }} style={[styles.slot, { borderColor: time === item ? colors.primary : colors.border, backgroundColor: time === item ? colors.primary : colors.surface }]}><Text style={{ color: time === item ? "#FFFFFF" : colors.foreground, fontWeight: "800" }}>{item}</Text></Pressable>)}</View> : <View style={[styles.empty, { borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>No suitable times on this day</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>Choose another day or contact the practice for assistance.</Text></View>}
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>What would you like to discuss?</Text><TextInput value={reason} onChangeText={setReason} placeholder="Optional note for Dr. Ojha’s team" placeholderTextColor={colors.muted} multiline maxLength={240} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} accessibilityLabel="Reason for visit" />
    {message ? <Text style={[styles.message, { color: colors.error }]}>{message}</Text> : null}<Pressable onPress={handleBooking} style={[styles.primaryButton, { backgroundColor: colors.primary }]} accessibilityRole="button"><Text style={styles.primaryButtonText}>Confirm appointment</Text></Pressable><Text style={[styles.privacy, { color: colors.muted }]}>This prototype stores booking changes only while the app is open. Connect a secure patient backend before handling real health information.</Text>
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ back: { fontSize: 15, fontWeight: "800", marginBottom: 20 }, eyebrow: { fontSize: 11, letterSpacing: 1.4, fontWeight: "800" }, title: { fontSize: 30, lineHeight: 36, fontWeight: "800", marginTop: 5 }, subtitle: { fontSize: 15, lineHeight: 22, marginTop: 4 }, sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 24, marginBottom: 12 }, childCard: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }, initials: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" }, initialsText: { color: "#FFFFFF", fontWeight: "800" }, cardTitle: { fontSize: 15, fontWeight: "800" }, cardMeta: { fontSize: 13, lineHeight: 19 }, option: { borderWidth: 1, borderRadius: 15, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }, dateRow: { flexDirection: "row", gap: 8 }, date: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", gap: 3 }, dateDay: { fontSize: 11, fontWeight: "700" }, dateNumber: { fontSize: 15, fontWeight: "800" }, slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, slot: { width: "31%", borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" }, empty: { borderWidth: 1, borderRadius: 15, padding: 15, gap: 4 }, input: { minHeight: 104, borderWidth: 1, borderRadius: 15, padding: 14, fontSize: 15, textAlignVertical: "top" }, message: { marginTop: 10, lineHeight: 20, fontWeight: "700" }, primaryButton: { marginTop: 18, borderRadius: 15, padding: 16, alignItems: "center" }, primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 }, privacy: { marginTop: 14, fontSize: 12, lineHeight: 18 } });
