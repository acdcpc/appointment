import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";

import { composeAge, emptyBookingDetails, saveBookingRequest, validateBookingDetails, type BookingDetails } from "@/lib/booking-requests";
import { getSupabaseSession } from "@/lib/supabase";
import { ageInMonths, todayClinicDate } from "@/lib/growth-measurements";

import { ScreenContainer } from "@/components/screen-container";
import { LanguageNavigationToggle } from "@/components/language-navigation-toggle";
import { clearBookingDraft, loadBookingDraft, saveBookingDraft } from "@/lib/booking-draft";
import { upcomingClinicDays } from "@/lib/clinic-days";
import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { useLanguagePreference } from "@/lib/language-preference";

const nepaliServiceLabels: Record<string, string> = {
  "Pediatric consultation": "बालरोग परामर्श",
  "Child development review": "बाल विकास समीक्षा",
  "Growth & wellbeing": "वृद्धि तथा स्वास्थ्य समीक्षा",
};

function timePeriod(value: string) {
  const match = /^(\d{1,2})(?::\d{2})?\s*(AM|PM)$/i.exec(value.trim());
  if (!match) return "Evening";
  const hour = (Number(match[1]) % 12) + (match[2].toUpperCase() === "PM" ? 12 : 0);
  return hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
}

/**
 * Booking screen — day → time → confirm, nothing else.
 *
 * The previous version buried the two things a parent came for (an open day and
 * an open time) under a service browser, topic filters, a "compact device
 * preview" switch, a service-suggestion form and an optional note. The visit
 * type is now chosen on the Book visit tab and arrives as a route param; here
 * the parent only picks a day, picks a time, and confirms.
 */
export default function BookingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeChild, services, getAvailableSlots, bookAppointment, clinicHours, clinicHolidays } = usePediatricCare();
  const { language } = useLanguagePreference();
  const params = useLocalSearchParams<{ service?: string }>();
  const draft = useMemo(() => loadBookingDraft(), []);

  const dates = useMemo(
    () => upcomingClinicDays(4, {
      closedWeekdays: clinicHours.filter((hour) => !hour.isOpen).map((hour) => hour.weekday),
      closedDates: clinicHolidays.map((holiday) => holiday.date),
    }),
    [clinicHours, clinicHolidays],
  );

  const [service, setService] = useState(() => {
    const requested = typeof params.service === "string" ? params.service : "";
    if (requested && services.some((item) => item.name === requested)) return requested;
    if (draft?.service && services.some((item) => item.name === draft.service)) return draft.service;
    return services[0]?.name ?? "";
  });
  const [date, setDate] = useState(() => (dates.includes(draft?.date ?? "") ? (draft?.date as string) : dates[0] ?? ""));
  const [time, setTime] = useState(() => draft?.time ?? "");
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [copyToast, setCopyToast] = useState("");
  const [details, setDetails] = useState<BookingDetails>(emptyBookingDetails);
  const [savedNotice, setSavedNotice] = useState("");
  const [dobDraft, setDobDraft] = useState("");

  /** Typing a date of birth fills years and months, so nobody has to count. */
  const applyDateOfBirth = (value: string) => {
    setDobDraft(value);
    const months = ageInMonths(value, todayClinicDate());
    if (months === null || months < 0) return;
    setDetails((current) => ({ ...current, childAgeYears: String(Math.floor(months / 12)), childAgeMonths: String(months % 12) }));
  };

  // Prefill the guardian's own email when they are signed in.
  useEffect(() => {
    let cancelled = false;
    getSupabaseSession().then((session) => {
      if (cancelled || !session?.user?.email) return;
      setDetails((current) => (current.guardianEmail ? current : { ...current, guardianEmail: session.user.email ?? "" }));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (dates.length && !dates.includes(date)) { setDate(dates[0]); setTime(""); setConfirming(false); }
  }, [dates, date]);

  const availableSlots = getAvailableSlots(date, service);
  const slotGroups = useMemo(
    () => (["Morning", "Afternoon", "Evening"] as const)
      .map((label) => ({ label, slots: availableSlots.filter((slot) => timePeriod(slot) === label) }))
      .filter((group) => group.slots.length),
    [availableSlots],
  );

  const selectedServiceLabel = language === "ne" ? nepaliServiceLabels[service] ?? service : service;

  const selectDay = (value: string) => { setDate(value); setTime(""); setConfirming(false); setMessage(""); saveBookingDraft({ service, date: value, time: "", reason: "" }); };
  const selectTime = (slot: string) => { setTime(slot); setConfirming(true); setMessage(""); saveBookingDraft({ service, date, time: slot, reason: "" }); };
  const selectService = (name: string) => { setService(name); setTime(""); setConfirming(false); setMessage(""); saveBookingDraft({ service: name, date, time: "", reason: "" }); };

  const confirmBooking = async () => {
    const validation = validateBookingDetails(details);
    if (!validation.ok) { setMessage(validation.message); return; }
    const result = bookAppointment({ childId: activeChild.id, service, date, time, reason: `${details.childName.trim()} · ${composeAge(Number(details.childAgeYears || 0), Number(details.childAgeMonths || 0))}` });
    if (!result.ok) { setMessage(result.message); return; }
    // Send the child's details to the clinic, then keep the visit locally.
    const saved = await saveBookingRequest({ details, service, date, time });
    setSavedNotice(saved.message);
    clearBookingDraft();
    setSuccess(true);
  };

  const setField = (key: keyof BookingDetails) => (value: string) => setDetails((current) => ({ ...current, [key]: value }));

  const appointmentSummary = `Rainbow Child Development Clinic\nAppointment: ${selectedServiceLabel}\nDate: ${date}\nTime: ${time}\nChild: ${activeChild.name}\n\nDr. Anil Ojha, MBBS, MD, FCCH`;
  const shareSummary = async () => {
    try {
      if (Platform.OS === "web") {
        const blob = new Blob([appointmentSummary], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `rainbow-appointment-${date.replace(/\W+/g, "-")}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }
      const uri = `${FileSystem.cacheDirectory}rainbow-appointment.txt`;
      await FileSystem.writeAsStringAsync(uri, appointmentSummary, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "text/plain", dialogTitle: "Share appointment summary" });
    } catch { /* share cancelled or unavailable */ }
  };
  const copySummary = async () => {
    try {
      await Clipboard.setStringAsync(appointmentSummary);
      setCopyToast("Copied to clipboard / क्लिपबोर्डमा कपी भयो");
    } catch { setCopyToast("Copy was unavailable / कपी गर्न सकिएन"); }
  };

  if (success) {
    return (
      <ScreenContainer className="p-5" maxWidth={980}>
        <View style={styles.successScreen}>
          <View style={[styles.successMark, { backgroundColor: colors.success }]}>
            <Text style={styles.successMarkText}>✓</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground, textAlign: "center" }]}>Visit requested</Text>
          <Text style={[styles.nepali, { color: colors.primary, textAlign: "center" }]}>भेट्ने समय अनुरोध भयो</Text>
          <Text style={[styles.subtitle, { color: colors.muted, textAlign: "center" }]}>
            {savedNotice || "Review your appointment summary below. The clinic has not sent a message automatically; call 9765002862 if you need to change it."}
          </Text>
          <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>WITH DR. ANIL OJHA</Text>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>{selectedServiceLabel}</Text>
            <Text style={[styles.summaryText, { color: colors.muted }]}>{date} · {time}</Text>
            <Text style={[styles.summaryText, { color: colors.muted }]}>{details.childName.trim() || activeChild.name}{composeAge(Number(details.childAgeYears || 0), Number(details.childAgeMonths || 0)) ? ` · ${composeAge(Number(details.childAgeYears || 0), Number(details.childAgeMonths || 0))}` : ""}</Text>
          </View>
          <Pressable onPress={shareSummary} style={[styles.primaryButton, { backgroundColor: colors.primary, marginBottom: 12 }]} accessibilityRole="button">
            <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>Share to WhatsApp / सेयर गर्नुहोस्</Text>
          </Pressable>
          <Pressable onPress={copySummary} style={[styles.secondaryButton, { borderColor: colors.primary }]} accessibilityRole="button">
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Copy summary / सारांश कपी गर्नुहोस्</Text>
          </Pressable>
          {copyToast ? (
            <View style={[styles.copyToast, { backgroundColor: colors.success }]}>
              <Text style={[styles.copyToastText, { color: colors.textInverse }]}>{copyToast}</Text>
            </View>
          ) : null}
          <Pressable onPress={() => router.replace("/(tabs)/appointments")} style={[styles.primaryButton, { backgroundColor: colors.action }]} accessibilityRole="button">
            <Text style={[styles.primaryButtonText, { color: colors.onAction }]}>View appointments / भेटहरू हेर्नुहोस्</Text>
          </Pressable>
          <Pressable onPress={() => router.replace("/(tabs)")} accessibilityRole="button">
            <Text style={[styles.link, { color: colors.primary }]}>Back to home / गृहपृष्ठमा फर्कनुहोस्</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-5" maxWidth={980}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={[styles.back, { color: colors.primary }]}>‹ Back / फर्कनुहोस्</Text>
        </Pressable>

        <View style={[styles.doctorBanner, { backgroundColor: colors.tealSurface, borderColor: colors.primary }]}>
          <View style={[styles.doctorBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.doctorBadgeText, { color: colors.textInverse }]}>Dr</Text>
          </View>
          <View style={styles.flexCopy}>
            <Text style={[styles.doctorName, { color: colors.foreground }]}>Associate Professor Dr. Anil Ojha</Text>
            <Text style={[styles.doctorMeta, { color: colors.muted }]}>MBBS, MD, FCCH · Developmental Pediatrician</Text>
          </View>
        </View>

        <Text style={[styles.eyebrow, { color: colors.primary }]}>RAINBOW CHILD DEVELOPMENT CLINIC</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Book a visit</Text>
        <Text style={[styles.nepali, { color: colors.primary }]}>भेट्ने समय लिनुहोस्</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Choose an available day, choose a time, and confirm.</Text>

        <View style={styles.steps}>
          <Text style={[styles.step, { color: colors.primary }]}>1 Day</Text>
          <Text style={[styles.step, { color: time ? colors.primary : colors.muted }]}>2 Time</Text>
          <Text style={[styles.step, { color: confirming ? colors.primary : colors.muted }]}>3 Confirm</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Visit type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {services.map((item) => (
            <Pressable
              key={item.name}
              onPress={() => selectService(item.name)}
              accessibilityRole="radio"
              accessibilityState={{ selected: service === item.name }}
              style={[styles.chip, {
                borderColor: service === item.name ? colors.primary : colors.border,
                backgroundColor: service === item.name ? colors.tealSurface : colors.surface,
              }]}
            >
              <Text style={{ color: service === item.name ? colors.primary : colors.foreground, fontWeight: "800" }}>
                {language === "ne" ? nepaliServiceLabels[item.name] ?? item.name : item.name} · {item.durationMinutes} min
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose an available day</Text>
        <View style={styles.dateRow}>
          {dates.map((item) => (
            <Pressable
              key={item}
              onPress={() => selectDay(item)}
              accessibilityRole="radio"
              accessibilityState={{ selected: date === item }}
              style={[styles.date, {
                borderColor: date === item ? colors.success : colors.border,
                backgroundColor: date === item ? colors.tealSurface : colors.surface,
              }]}
            >
              <Text style={[styles.dateDay, { color: date === item ? colors.success : colors.muted }]}>{item.split(", ")[0]}</Text>
              <Text style={[styles.dateNumber, { color: colors.foreground }]}>{item.split(" ").at(-1)}</Text>
              <Text style={[styles.available, { color: colors.success }]}>Available</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose a time</Text>
        {slotGroups.length ? slotGroups.map((group) => (
          <View key={group.label} style={styles.slotGroup}>
            <Text style={[styles.groupTitle, { color: colors.muted }]}>{group.label}</Text>
            <View style={styles.slotRow}>
              {group.slots.map((slot) => (
                <Pressable
                  key={slot}
                  onPress={() => selectTime(slot)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: time === slot }}
                  style={[styles.slot, {
                    borderColor: time === slot ? colors.primary : colors.border,
                    backgroundColor: time === slot ? colors.primary : colors.surface,
                  }]}
                >
                  <Text style={{ color: time === slot ? colors.textInverse : colors.foreground, fontWeight: "900" }}>{slot}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )) : (
          <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.serviceTitle, { color: colors.foreground }]}>No open times on this day</Text>
            <Text style={[styles.serviceMeta, { color: colors.muted }]}>Choose another available day or call 9765002862 for help.</Text>
          </View>
        )}

        {confirming ? (
          <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Text style={[styles.summaryLabel, { color: colors.primary }]}>CONFIRM THIS TIME</Text>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>{selectedServiceLabel}</Text>
            <Text style={[styles.summaryText, { color: colors.muted }]}>{date} · {time}</Text>
            <Text style={[styles.summaryText, { color: colors.muted }]}>For {activeChild.name}</Text>
            <Text style={[styles.summaryLabel, { color: colors.primary, marginTop: 10 }]}>WHO IS THIS VISIT FOR?</Text>
            <Text style={[styles.reviewNote, { color: colors.muted }]}>The clinic needs the child’s name, age and sex, and a contact number. Weight and height are optional.</Text>
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.muted }]}>Child’s name</Text>
              <TextInput value={details.childName} onChangeText={setField("childName")} placeholder="Child's full name" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel="Child name" />
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.muted }]}>Date of birth (optional)</Text>
              <TextInput value={dobDraft} onChangeText={applyDateOfBirth} placeholder="14 May 2022" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel="Child date of birth optional" />
              <Text style={[styles.reviewNote, { color: colors.muted }]}>Enter a date of birth and the age below fills in for you.</Text>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Age</Text>
                <View style={styles.ageRow}>
                  <View style={styles.ageField}>
                    <TextInput value={details.childAgeYears} onChangeText={setField("childAgeYears")} keyboardType="number-pad" placeholder="4" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel="Child age in years" />
                    <Text style={[styles.ageUnit, { color: colors.muted }]}>years</Text>
                  </View>
                  <View style={styles.ageField}>
                    <TextInput value={details.childAgeMonths} onChangeText={setField("childAgeMonths")} keyboardType="number-pad" placeholder="2" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel="Child age in months" />
                    <Text style={[styles.ageUnit, { color: colors.muted }]}>months</Text>
                  </View>
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Sex</Text>
                <View style={styles.sexRow}>
                  {(["male", "female"] as const).map((option) => (
                    <Pressable key={option} onPress={() => setField("childSex")(option)} accessibilityRole="radio" accessibilityState={{ selected: details.childSex === option }} style={[styles.sexChip, { borderColor: details.childSex === option ? colors.primary : colors.border, backgroundColor: details.childSex === option ? colors.tealSurface : colors.surface }]}>
                      <Text style={{ color: details.childSex === option ? colors.primary : colors.foreground, fontWeight: "800", fontSize: 13 }}>{option === "male" ? "Boy / छोरा" : "Girl / छोरी"}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Weight in kg (optional)</Text>
                <TextInput value={String(details.weightKg ?? "")} onChangeText={setField("weightKg")} keyboardType="decimal-pad" placeholder="15.2" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel="Child weight in kilograms" />
              </View>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.muted }]}>Height in cm (optional)</Text>
                <TextInput value={String(details.heightCm ?? "")} onChangeText={setField("heightCm")} keyboardType="decimal-pad" placeholder="99.4" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel="Child height in centimetres" />
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.muted }]}>Parent contact number</Text>
              <TextInput value={details.guardianPhone} onChangeText={setField("guardianPhone")} keyboardType="phone-pad" placeholder="98XXXXXXXX" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel="Parent contact number" />
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.muted }]}>Email (optional)</Text>
              <TextInput value={details.guardianEmail ?? ""} onChangeText={setField("guardianEmail")} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel="Parent email address optional" />
            </View>
            <Text style={[styles.reviewNote, { color: colors.muted }]}>These details are saved to the clinic and to your profile, where you can change them at any time.</Text>
            {message ? <Text style={[styles.message, { color: colors.error }]}>{message}</Text> : null}
            <Pressable onPress={confirmBooking} style={[styles.primaryButton, { backgroundColor: colors.action }]} accessibilityRole="button">
              <Text style={[styles.primaryButtonText, { color: colors.onAction }]}>Confirm the time / समय निश्चित गर्नुहोस्</Text>
            </Pressable>
            <Pressable onPress={() => { setConfirming(false); setTime(""); saveBookingDraft({ service, date, time: "", reason: "" }); }} accessibilityRole="button">
              <Text style={[styles.link, { color: colors.primary }]}>Change the time / समय सच्याउनुहोस्</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.sectionHint, { color: colors.muted }]}>Pick a time above to confirm it.</Text>
        )}
        {!confirming && message ? <Text style={[styles.message, { color: colors.error }]}>{message}</Text> : null}
        <Text style={[styles.privacy, { color: colors.muted }]}>Need help? Call 9765002862.</Text>
      </ScrollView>
      <LanguageNavigationToggle />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 15, fontWeight: "900", marginBottom: 14 },
  doctorBanner: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  doctorBadge: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  doctorBadgeText: { fontWeight: "900" },
  flexCopy: { flex: 1 },
  doctorName: { fontSize: 13, fontWeight: "900" },
  doctorMeta: { fontSize: 11, lineHeight: 16 },
  eyebrow: { fontSize: 11, letterSpacing: 1.3, fontWeight: "900" },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "900", marginTop: 5 },
  nepali: { fontSize: 16, fontWeight: "800", marginTop: 2, lineHeight: 22 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 4 },
  steps: { flexDirection: "row", gap: 12, marginTop: 16 },
  step: { fontSize: 12, fontWeight: "900" },
  sectionTitle: { fontSize: 19, fontWeight: "900", marginTop: 24 },
  sectionHint: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  chipRow: { gap: 8, paddingVertical: 10 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  dateRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  date: { minWidth: 84, borderWidth: 1, borderRadius: 14, padding: 10, alignItems: "center", gap: 2 },
  dateDay: { fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  dateNumber: { fontSize: 18, fontWeight: "900" },
  available: { fontSize: 10, fontWeight: "800" },
  slotGroup: { marginTop: 14 },
  groupTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  slot: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, alignItems: "center", justifyContent: "center" },
  empty: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6, marginTop: 12 },
  serviceTitle: { fontSize: 15, fontWeight: "900" },
  serviceMeta: { fontSize: 13, lineHeight: 19 },
  reviewCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 6, marginTop: 22 },
  summaryLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  summaryTitle: { fontSize: 17, fontWeight: "900" },
  summaryText: { fontSize: 14, lineHeight: 20 },
  reviewNote: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  formField: { flex: 1, minWidth: 140, gap: 4, marginTop: 6 },
  formRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  formLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, minHeight: 44 },
  sexRow: { flexDirection: "row", gap: 8 },
  ageRow: { flexDirection: "row", gap: 8 },
  ageField: { flex: 1, gap: 2 },
  ageUnit: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  sexChip: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, minHeight: 44, alignItems: "center", justifyContent: "center" },
  message: { fontSize: 13, lineHeight: 19, fontWeight: "800", marginTop: 8 },
  primaryButton: { borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 14 },
  primaryButtonText: { fontSize: 15, fontWeight: "900" },
  secondaryButton: { borderWidth: 1, borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "900" },
  copyToast: { borderRadius: 12, padding: 10, alignItems: "center", marginTop: 10 },
  copyToastText: { fontWeight: "900", fontSize: 13 },
  link: { fontSize: 14, fontWeight: "900", marginTop: 12, textAlign: "center" },
  privacy: { fontSize: 12, lineHeight: 18, marginTop: 18, marginBottom: 8 },
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 24 },
  successMark: { width: 62, height: 62, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  successMarkText: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  summary: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 5, width: "100%", marginTop: 12 },
});
