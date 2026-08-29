import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { trpc } from "@/lib/trpc";
import { useLanguagePreference } from "@/lib/language-preference";

const dates = ["Tue, Aug 20", "Wed, Aug 21", "Thu, Aug 22"];
const serviceSymbols = ["☼", "⌁", "✦", "♥"];
const nepaliServiceLabels: Record<string, string> = {
  "Pediatric consultation": "बालरोग परामर्श",
  "Child development review": "बाल विकास समीक्षा",
  "Growth & wellbeing": "वृद्धि तथा स्वास्थ्य समीक्षा",
};
const serviceFilters = [
  { key: "All", label: "All / सबै" },
  { key: "Pediatric", label: "Pediatric / बालरोग" },
  { key: "Development", label: "Development / विकास" },
  { key: "Wellbeing", label: "Wellbeing / स्वास्थ्य" },
] as const;
type ServiceFilterKey = (typeof serviceFilters)[number]["key"];

function timePeriod(value: string) {
  const match = /^(\d{1,2})(?::\d{2})?\s*(AM|PM)$/i.exec(value.trim());
  if (!match) return "Evening";
  const hour = Number(match[1]) % 12 + (match[2].toUpperCase() === "PM" ? 12 : 0);
  return hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
}

export default function BookingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeChild, services, getAvailableSlots, bookAppointment } = usePediatricCare();
  const { language } = useLanguagePreference();
  const [service, setService] = useState(services[0]?.name ?? "");
  const [date, setDate] = useState(dates[0]);
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilterKey>("All");
  const [compactPreview, setCompactPreview] = useState(false);
  const [suggestionDraft, setSuggestionDraft] = useState("");
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [suggestionEmail, setSuggestionEmail] = useState("");
  const [suggestionConsent, setSuggestionConsent] = useState(false);
  const [copyToast, setCopyToast] = useState("");
  const suggestService = trpc.clinicPublic.suggestService.useMutation();
  const selectedServiceLabel = language === "ne" ? nepaliServiceLabels[service] ?? service : service;

  const availableSlots = getAvailableSlots(date, service);
  const slotGroups = useMemo(
    () => (["Morning", "Afternoon", "Evening"] as const)
      .map((label) => ({ label, slots: availableSlots.filter((slot) => timePeriod(slot) === label) }))
      .filter((group) => group.slots.length),
    [availableSlots],
  );
  const visibleServices = useMemo(() => services.filter((item) => {
    const english = item.name.toLowerCase();
    const searchable = `${english} ${nepaliServiceLabels[item.name] ?? ""}`.toLowerCase();
    const queryMatches = !serviceSearch.trim() || searchable.includes(serviceSearch.trim().toLowerCase());
    const topicMatches = serviceFilter === "All"
      || (serviceFilter === "Pediatric" && (english.includes("pediatric") || english.includes("consult")))
      || (serviceFilter === "Development" && english.includes("development"))
      || (serviceFilter === "Wellbeing" && (english.includes("growth") || english.includes("well") || english.includes("follow")));
    return queryMatches && topicMatches;
  }), [serviceFilter, serviceSearch, services]);

  const selectService = (name: string) => { setService(name); setTime(""); setReviewing(false); setMessage(""); };
  const selectDate = (value: string) => { setDate(value); setTime(""); setReviewing(false); setMessage(""); };
  const reviewBooking = () => {
    if (!time) { setMessage("Choose an available appointment time / उपलब्ध समय छान्नुहोस्।"); return; }
    setReviewing(true); setMessage("");
  };
  const confirmBooking = () => {
    const result = bookAppointment({ childId: activeChild.id, service, date, time, reason: reason.trim() || "Parent requested appointment" });
    if (!result.ok) { setMessage(result.message); return; }
    setSuccess(true);
  };

  const appointmentSummary = `Rainbow Child Development Clinic\nAppointment: ${selectedServiceLabel}\nDate: ${date}\nTime: ${time}\nChild: ${activeChild.name}\n\nDr. Anil Ojha, MBBS, MD, FCCH`;
  const shareSummary = async () => {
    const summary = appointmentSummary;
    try {
      if (Platform.OS === "web") {
        const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `rainbow-appointment-${date.replace(/\W+/g, "-")}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }
      const uri = `${FileSystem.cacheDirectory}rainbow-appointment.txt`;
      await FileSystem.writeAsStringAsync(uri, summary, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "text/plain", dialogTitle: "Share appointment summary" });
      }
    } catch {
      // Ignore share cancellation or failure
    }
  };
  const copySummary = async () => {
    try {
      await Clipboard.setStringAsync(appointmentSummary);
      setCopyToast("Copied to clipboard / क्लिपबोर्डमा कपी भयो");
    } catch {
      setCopyToast("Copy was unavailable / कपी गर्न सकिएन");
    }
  };

  const submitSuggestion = async () => {
    if (!suggestionDraft.trim()) { setSuggestionMessage("Enter a general service name before submitting."); return; }
    const notificationEmail = suggestionEmail.trim().toLowerCase();
    if (notificationEmail && !suggestionConsent) { setSuggestionMessage("Confirm the optional contact preference before submitting an email."); return; }
    if (!notificationEmail && suggestionConsent) { setSuggestionMessage("Enter an email or clear the optional contact preference."); return; }
    try {
      const result = await suggestService.mutateAsync({ suggestedService: suggestionDraft.trim(), notificationEmail: notificationEmail || undefined, notificationConsented: suggestionConsent });
      setSuggestionDraft(""); setSuggestionEmail(""); setSuggestionConsent(false);
      setSuggestionMessage(result.alreadySubmitted ? "This service suggestion was already recorded recently for review." : result.meaning);
    } catch {
      setSuggestionMessage("This suggestion could not be recorded. Please try again later.");
    }
  };

  if (success) {
    return <ScreenContainer className="p-5"><View style={styles.successScreen}>
      <View style={[styles.successMark, { backgroundColor: colors.success }]}><Text style={styles.successMarkText}>✓</Text></View>
      <Text style={[styles.title, { color: colors.foreground, textAlign: "center" }]}>Visit requested</Text>
      <Text style={[styles.nepali, { color: colors.primary, textAlign: "center" }]}>भेट्ने समय अनुरोध भयो</Text>
      <Text style={[styles.subtitle, { color: colors.muted, textAlign: "center" }]}>Review your appointment summary below. The clinic has not sent a message automatically.</Text>
      <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.muted }]}>WITH DR. ANIL OJHA</Text>
        <Text style={[styles.summaryTitle, { color: colors.foreground }]}>{selectedServiceLabel}</Text>
        <Text style={[styles.summaryText, { color: colors.muted }]}>{date} · {time}</Text>
        <Text style={[styles.summaryText, { color: colors.muted }]}>{activeChild.name}</Text>
      </View>
      <Pressable onPress={shareSummary} style={[styles.primaryButton, { backgroundColor: colors.primary, marginBottom: 12 }]}><Text style={styles.primaryButtonText}>Share to WhatsApp / सेयर गर्नुहोस्</Text></Pressable>
      <Pressable onPress={copySummary} style={[styles.secondaryButton, { borderColor: colors.primary }]}><Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Copy summary / सारांश कपी गर्नुहोस्</Text></Pressable>
      {copyToast ? <View style={[styles.copyToast, { backgroundColor: colors.success }]}><Text style={styles.copyToastText}>{copyToast}</Text></View> : null}
      <Pressable onPress={() => router.replace("/(tabs)/appointments")} style={[styles.primaryButton, { backgroundColor: colors.action }]}><Text style={styles.primaryButtonText}>View appointments / भेटहरू हेर्नुहोस्</Text></Pressable>
      <Pressable onPress={() => router.replace("/(tabs)")}><Text style={[styles.link, { color: colors.primary }]}>Back to home / गृहपृष्ठमा फर्कनुहोस्</Text></Pressable>
    </View></ScreenContainer>;
  }

  return <ScreenContainer className="p-5"><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => reviewing ? setReviewing(false) : router.back()} accessibilityRole="button"><Text style={[styles.back, { color: colors.primary }]}>‹ {reviewing ? "Edit choices / सच्याउनुहोस्" : "Back / फर्कनुहोस्"}</Text></Pressable>
    <View style={[styles.doctorBanner, { backgroundColor: colors.tealSurface, borderColor: colors.primary }]}><View style={[styles.doctorBadge, { backgroundColor: colors.primary }]}><Text style={[styles.doctorBadgeText, { color: colors.textInverse }]}>Dr</Text></View><View style={styles.flexCopy}><Text style={[styles.doctorName, { color: colors.foreground }]}>Associate Professor Dr. Anil Ojha</Text><Text style={[styles.doctorMeta, { color: colors.muted }]}>MBBS, MD, FCCH · Developmental Pediatrician</Text></View></View>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>RAINBOW CHILD DEVELOPMENT CLINIC</Text>
    <Text style={[styles.title, { color: colors.foreground }]}>{reviewing ? "Confirm your visit" : "Book a visit"}</Text>
    <Text style={[styles.nepali, { color: colors.primary }]}>{reviewing ? "भेट्ने समय जाँच गर्नुहोस्" : "भेट्ने समय लिनुहोस्"}</Text>
    <Text style={[styles.subtitle, { color: colors.muted }]}>{reviewing ? "Review one summary, then confirm." : "Choose a visit type, an available day, and a time. We will ask for details later if needed."}</Text>
    <View style={styles.steps}><Text style={[styles.step, { color: colors.primary }]}>1 Visit</Text><Text style={[styles.step, { color: time ? colors.primary : colors.muted }]}>2 Time</Text><Text style={[styles.step, { color: reviewing ? colors.primary : colors.muted }]}>3 Confirm</Text></View>

    {reviewing ? <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
      <Text style={[styles.summaryLabel, { color: colors.primary }]}>APPOINTMENT SUMMARY</Text>
      <Text style={[styles.summaryTitle, { color: colors.foreground }]}>{selectedServiceLabel}</Text>
      <Text style={[styles.summaryText, { color: colors.muted }]}>{date} · {time}</Text>
      <Text style={[styles.summaryText, { color: colors.muted }]}>For {activeChild.name}</Text>
      <Text style={[styles.reviewNote, { color: colors.muted }]}>Confirmation records this appointment request. It does not send a WhatsApp or calendar message automatically.</Text>
      {message ? <Text style={[styles.message, { color: colors.error }]}>{message}</Text> : null}
      <Pressable onPress={confirmBooking} style={[styles.primaryButton, { backgroundColor: colors.action }]} accessibilityRole="button"><Text style={styles.primaryButtonText}>Confirm visit / समय निश्चित गर्नुहोस्</Text></Pressable>
    </View> : <>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose a visit type</Text>
      <Text style={[styles.sectionHint, { color: colors.muted }]}>एक सेवा छान्नुहोस्</Text>
      <Pressable onPress={() => setCompactPreview((value) => !value)} accessibilityRole="switch" accessibilityState={{ checked: compactPreview }} style={[styles.previewToggle, { borderColor: compactPreview ? colors.primary : colors.border, backgroundColor: compactPreview ? colors.tealSurface : colors.surface }]}><Text style={[styles.previewToggleText, { color: colors.foreground }]}>{compactPreview ? "Compact device preview on" : "Preview compact device layout"}</Text><Text style={{ color: colors.primary, fontWeight: "900" }}>{compactPreview ? "On" : "Off"}</Text></Pressable>
      <Text style={[styles.previewNote, { color: colors.muted }]}>This local display aid narrows only the service browser; it does not change your appointment or device settings.</Text>
      <View style={[styles.browserFrame, compactPreview && styles.compactFrame]}>
        <TextInput value={serviceSearch} onChangeText={setServiceSearch} placeholder="Search visit type / सेवा खोज्नुहोस्" placeholderTextColor={colors.muted} style={[styles.serviceSearch, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} accessibilityLabel="Search visit types" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{serviceFilters.map((filter) => <Pressable key={filter.key} onPress={() => setServiceFilter(filter.key)} accessibilityRole="radio" accessibilityState={{ selected: serviceFilter === filter.key }} style={[styles.topicChip, { borderColor: serviceFilter === filter.key ? colors.primary : colors.border, backgroundColor: serviceFilter === filter.key ? colors.tealSurface : colors.surface }]}><Text style={{ color: serviceFilter === filter.key ? colors.primary : colors.foreground, fontWeight: "900" }}>{filter.label}</Text></Pressable>)}</ScrollView>
        <View style={[styles.serviceGrid, compactPreview && styles.compactGrid]}>{visibleServices.length ? visibleServices.map((item) => { const index = services.findIndex((candidate) => candidate.name === item.name); return <Pressable key={item.name} onPress={() => selectService(item.name)} accessibilityRole="radio" accessibilityState={{ selected: service === item.name }} style={[styles.serviceCard, compactPreview && styles.compactServiceCard, { borderColor: service === item.name ? colors.primary : colors.border, backgroundColor: service === item.name ? colors.tealSurface : colors.surface }]}><Text style={[styles.serviceIcon, { color: service === item.name ? colors.primary : colors.muted }]}>{serviceSymbols[index % serviceSymbols.length]}</Text><Text style={[styles.serviceTitle, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.nepaliLabel, { color: colors.primary }]}>{nepaliServiceLabels[item.name]}</Text><Text style={[styles.serviceMeta, { color: colors.muted }]}>{item.durationMinutes} min</Text><Text style={{ color: service === item.name ? colors.primary : colors.muted, fontSize: 12, fontWeight: "900" }}>{service === item.name ? "Selected / छानियो" : "Choose / छान्नुहोस्"}</Text></Pressable>; }) : <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[styles.serviceTitle, { color: colors.foreground }]}>No matching visit type</Text><Text style={[styles.serviceMeta, { color: colors.muted }]}>Clear the search or choose All to see available visit types.</Text><TextInput value={suggestionDraft} onChangeText={setSuggestionDraft} placeholder="General service name only" placeholderTextColor={colors.muted} maxLength={80} style={[styles.suggestionInput, { color: colors.foreground, borderColor: colors.border }]} accessibilityLabel="Suggest a general service name" /><Text style={[styles.previewNote, { color: colors.muted }]}>Do not enter a child’s name, symptoms, clinical details, passwords, or codes. A suggestion is not an appointment or clinical request.</Text><Pressable onPress={submitSuggestion} disabled={suggestService.isPending} style={[styles.suggestButton, { borderColor: colors.primary, opacity: suggestService.isPending ? 0.7 : 1 }]}><Text style={{ color: colors.primary, fontWeight: "900" }}>{suggestService.isPending ? "Recording…" : "Suggest a service / सेवा सुझाव दिनुहोस्"}</Text></Pressable>{suggestionMessage ? <Text style={[styles.previewNote, { color: suggestionMessage.includes("could not") ? colors.error : colors.success }]}>{suggestionMessage}</Text> : null}</View>}</View>
      </View>{visibleServices.length === 0 ? <View style={[styles.contactPreference, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[styles.serviceTitle, { color: colors.foreground }]}>Optional contact preference</Text><TextInput value={suggestionEmail} onChangeText={setSuggestionEmail} placeholder="Email only if you want future availability review" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" style={[styles.suggestionInput, { color: colors.foreground, borderColor: colors.border }]} accessibilityLabel="Optional service suggestion contact email" /><Pressable onPress={() => setSuggestionConsent((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: suggestionConsent }} style={[styles.contactCheck, { borderColor: suggestionConsent ? colors.primary : colors.border }]}><Text style={{ color: suggestionConsent ? colors.primary : colors.muted, fontWeight: "900" }}>{suggestionConsent ? "✓" : "○"}</Text><Text style={[styles.previewNote, { color: colors.foreground }]}>I want the super-admin to review this optional contact preference if the service is ever available.</Text></Pressable><Text style={[styles.previewNote, { color: colors.muted }]}>No email is sent automatically, contact is not guaranteed, and this does not create an appointment.</Text></View> : null}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose an available day</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>हरियो दिनमा समय उपलब्ध छ</Text>
      <View style={styles.dateRow}>{dates.map((item) => <Pressable key={item} onPress={() => selectDate(item)} accessibilityRole="radio" accessibilityState={{ selected: date === item }} style={[styles.date, { borderColor: date === item ? colors.success : colors.border, backgroundColor: date === item ? colors.tealSurface : colors.surface }]}><Text style={[styles.dateDay, { color: date === item ? colors.success : colors.muted }]}>{item.split(", ")[0]}</Text><Text style={[styles.dateNumber, { color: colors.foreground }]}>{item.split(" ").at(-1)}</Text><Text style={[styles.available, { color: colors.success }]}>Available</Text></Pressable>)}</View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose a time</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>उपलब्ध समय छान्नुहोस्</Text>
      {slotGroups.length ? slotGroups.map((group) => <View key={group.label} style={styles.slotGroup}><Text style={[styles.groupTitle, { color: colors.muted }]}>{group.label}</Text><View style={styles.slotRow}>{group.slots.map((slot) => <Pressable key={slot} onPress={() => { setTime(slot); setReviewing(false); setMessage(""); }} accessibilityRole="radio" accessibilityState={{ selected: time === slot }} style={[styles.slot, { borderColor: time === slot ? colors.primary : colors.border, backgroundColor: time === slot ? colors.primary : colors.surface }]}><Text style={{ color: time === slot ? colors.textInverse : colors.foreground, fontWeight: "900" }}>{slot}</Text></Pressable>)}</View></View>) : <View style={[styles.empty, { borderColor: colors.border }]}><Text style={[styles.serviceTitle, { color: colors.foreground }]}>No open times on this day</Text><Text style={[styles.serviceMeta, { color: colors.muted }]}>Choose another available day or call 9765002862 for help.</Text></View>}
      <Pressable onPress={() => setShowReason((value) => !value)} style={styles.optionalToggle}><Text style={{ color: colors.primary, fontWeight: "900" }}>{showReason ? "Hide optional note" : "Add an optional note"}</Text></Pressable>
      {showReason ? <TextInput value={reason} onChangeText={setReason} placeholder="Optional note for Dr. Ojha’s team" placeholderTextColor={colors.muted} multiline maxLength={240} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} accessibilityLabel="Optional visit note" /> : null}
      {message ? <Text style={[styles.message, { color: colors.error }]}>{message}</Text> : null}
      <Pressable onPress={reviewBooking} style={[styles.primaryButton, { backgroundColor: colors.action }]} accessibilityRole="button"><Text style={styles.primaryButtonText}>Review visit / समय जाँच गर्नुहोस्</Text></Pressable>
      <Text style={[styles.privacy, { color: colors.muted }]}>Need help? Call 9765002862. Avoid entering clinical details, passwords, verification codes, or patient identifiers in an optional note.</Text>
    </>}
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  back: { fontSize: 15, fontWeight: "900", marginBottom: 14 }, doctorBanner: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }, doctorBadge: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center" }, doctorBadgeText: { fontWeight: "900" }, flexCopy: { flex: 1 }, doctorName: { fontSize: 13, fontWeight: "900" }, doctorMeta: { fontSize: 11, lineHeight: 16 }, eyebrow: { fontSize: 11, letterSpacing: 1.3, fontWeight: "900" }, title: { fontSize: 30, lineHeight: 36, fontWeight: "900", marginTop: 5 }, nepali: { fontSize: 16, fontWeight: "800", marginTop: 2 }, subtitle: { fontSize: 14, lineHeight: 21, marginTop: 6 }, steps: { flexDirection: "row", gap: 12, marginTop: 16 }, step: { fontSize: 12, fontWeight: "900" }, sectionTitle: { fontSize: 19, fontWeight: "900", marginTop: 24 }, sectionHint: { fontSize: 12, lineHeight: 17, marginTop: 2 }, previewToggle: { marginTop: 11, minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }, previewToggleText: { fontSize: 13, fontWeight: "900" }, previewNote: { fontSize: 11, lineHeight: 16, marginTop: 5 }, browserFrame: { width: "100%" }, compactFrame: { maxWidth: 320, alignSelf: "center" }, serviceSearch: { minHeight: 45, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 14, marginTop: 11 }, filterRow: { gap: 8, paddingTop: 10, paddingBottom: 2 }, topicChip: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, justifyContent: "center" }, serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 11 }, compactGrid: { flexDirection: "column" }, serviceCard: { borderWidth: 1, borderRadius: 18, padding: 13, gap: 4, flexGrow: 1, minWidth: 145, maxWidth: "48%" }, compactServiceCard: { maxWidth: "100%", width: "100%", minWidth: 0 }, serviceIcon: { fontSize: 22, fontWeight: "900" }, serviceTitle: { fontSize: 14, fontWeight: "900", lineHeight: 19 }, nepaliLabel: { fontSize: 13, fontWeight: "800", lineHeight: 18 }, serviceMeta: { fontSize: 12, lineHeight: 17 }, suggestionInput: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, fontSize: 13, marginTop: 6 }, suggestButton: { minHeight: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", marginTop: 7 }, contactPreference: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 5, marginTop: 10 }, contactCheck: { minHeight: 44, borderWidth: 1, borderRadius: 12, padding: 8, gap: 7, flexDirection: "row", alignItems: "center" }, dateRow: { flexDirection: "row", gap: 8, marginTop: 11 }, date: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 11, alignItems: "center", gap: 2 }, dateDay: { fontSize: 11, fontWeight: "900" }, dateNumber: { fontSize: 16, fontWeight: "900" }, available: { fontSize: 12, fontWeight: "900" }, slotGroup: { marginTop: 12, gap: 7 }, groupTitle: { fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6 }, slotRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, slot: { minWidth: 94, minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, alignItems: "center", justifyContent: "center" }, empty: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 4, marginTop: 12, flexGrow: 1 }, optionalToggle: { alignSelf: "flex-start", marginTop: 18, minHeight: 44, justifyContent: "center" }, input: { minHeight: 100, borderWidth: 1, borderRadius: 16, padding: 13, fontSize: 14, textAlignVertical: "top", marginTop: 7 }, message: { marginTop: 10, lineHeight: 20, fontWeight: "800" }, primaryButton: { marginTop: 18, borderRadius: 16, minHeight: 54, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }, primaryButtonText: { fontWeight: "900", fontSize: 15, textAlign: "center" }, secondaryButton: { minHeight: 48, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 }, secondaryButtonText: { fontSize: 14, fontWeight: "900" }, copyToast: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignSelf: "center", marginBottom: 12 }, copyToastText: { fontSize: 13, fontWeight: "900" }, privacy: { marginTop: 13, fontSize: 11, lineHeight: 17 }, reviewCard: { borderWidth: 1, borderRadius: 20, padding: 17, gap: 8, marginTop: 20 }, summary: { borderWidth: 1, borderRadius: 20, padding: 17, gap: 7, width: "100%" }, summaryLabel: { fontSize: 11, letterSpacing: 1, fontWeight: "900" }, summaryTitle: { fontSize: 19, fontWeight: "900" }, summaryText: { fontSize: 14, lineHeight: 20 }, reviewNote: { fontSize: 12, lineHeight: 18 }, link: { fontSize: 14, fontWeight: "900", marginTop: 18 }, successScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 13, paddingVertical: 30 }, successMark: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" }, successMarkText: { fontSize: 36, fontWeight: "900" },
});
