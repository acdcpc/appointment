import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { upcomingClinicDays } from "@/lib/clinic-days";

const nepaliServiceLabels: Record<string, string> = {
  "Pediatric consultation": "बालरोग परामर्श",
  "Child development review": "बाल विकास समीक्षा",
  "Growth & wellbeing": "वृद्धि तथा स्वास्थ्य समीक्षा",
};

const topicChips = [
  { key: "All", label: "All / सबै" },
  { key: "Pediatric", label: "Pediatric / बालरोग" },
  { key: "Development", label: "Development / विकास" },
  { key: "Wellbeing", label: "Wellbeing / स्वास्थ्य" },
] as const;
type TopicKey = (typeof topicChips)[number]["key"];

function friendlyHours(range: string) {
  const [start, end] = range.split("–").map((part) => part.trim());
  const render = (value: string) => {
    const [hourText, minuteText] = value.split(":");
    const hour = Number(hourText);
    const suffix = hour >= 12 ? "PM" : "AM";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${minuteText} ${suffix}`;
  };
  if (!start || !end) return range;
  return `${render(start)} – ${render(end)}`;
}

/**
 * Book visit tab.
 *
 * This screen previously listed three fixed service chips and a clinician card
 * that had no press handler at all, so tapping anything did nothing and the tab
 * never reached the real booking flow. It now filters the clinic's live service
 * list and hands the chosen visit type to /booking, where the day and time are
 * picked against real clinic hours.
 */
export default function BookVisitTab() {
  const colors = useColors();
  const router = useRouter();
  const { services, clinicHours, clinicHolidays } = usePediatricCare();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<TopicKey>("All");
  const [selected, setSelected] = useState(() => services[0]?.name ?? "");

  const nextDays = useMemo(
    () => upcomingClinicDays(3, {
      closedWeekdays: clinicHours.filter((hour) => !hour.isOpen).map((hour) => hour.weekday),
      closedDates: clinicHolidays.map((holiday) => holiday.date),
    }),
    [clinicHours, clinicHolidays],
  );

  const nextDayHours = useMemo(() => {
    const weekday = nextDays[0]?.slice(0, 3);
    const day = clinicHours.find((hour) => hour.weekday === weekday && hour.isOpen);
    return day ? friendlyHours(`${day.start}–${day.end}`) : "";
  }, [clinicHours, nextDays]);

  const visibleServices = useMemo(() => services.filter((item) => {
    const english = item.name.toLowerCase();
    const searchable = `${english} ${nepaliServiceLabels[item.name] ?? ""}`.toLowerCase();
    const queryMatches = !query.trim() || searchable.includes(query.trim().toLowerCase());
    const topicMatches = topic === "All"
      || (topic === "Pediatric" && (english.includes("pediatric") || english.includes("consult")))
      || (topic === "Development" && english.includes("development"))
      || (topic === "Wellbeing" && (english.includes("growth") || english.includes("well") || english.includes("follow")));
    return queryMatches && topicMatches;
  }), [query, services, topic]);

  const startBooking = () => {
    if (!selected) return;
    router.push({ pathname: "/booking", params: { service: selected } });
  };

  return (
    <ScreenContainer className="p-5">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>DR. ANIL OJHA CHILD CARE</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Book a visit / भेट्ने समय लिनुहोस्</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Choose a visit type, then pick an open clinic day and time.</Text>

        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.muted, fontSize: 17 }}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search visit types"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.foreground }]}
            accessibilityLabel="Search visit types"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {topicChips.map((chip) => (
            <Pressable
              key={chip.key}
              onPress={() => setTopic(chip.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: topic === chip.key }}
              style={[styles.chip, {
                borderColor: topic === chip.key ? colors.primary : colors.border,
                backgroundColor: topic === chip.key ? colors.tealSurface : colors.surface,
              }]}
            >
              <Text style={{ color: topic === chip.key ? colors.primary : colors.foreground, fontWeight: "800" }}>{chip.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.section, { color: colors.foreground }]}>Choose a visit type</Text>
        {visibleServices.length ? visibleServices.map((item) => {
          const isSelected = selected === item.name;
          return (
            <Pressable
              key={item.name}
              onPress={() => setSelected(item.name)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              style={[styles.serviceCard, {
                backgroundColor: isSelected ? colors.tealSurface : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              }]}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.serviceTitle, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>{nepaliServiceLabels[item.name] ?? ""}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{item.durationMinutes} min</Text>
              </View>
              <Text style={{ color: isSelected ? colors.primary : colors.muted, fontSize: 13, fontWeight: "900" }}>
                {isSelected ? "✓ Selected / छानियो" : "Choose / छान्नुहोस्"}
              </Text>
            </Pressable>
          );
        }) : (
          <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.serviceTitle, { color: colors.foreground }]}>No visit type matches that search</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>Clear the search or switch back to All to see every visit type.</Text>
            <Pressable onPress={() => { setQuery(""); setTopic("All"); }} accessibilityRole="button" style={[styles.clearButton, { borderColor: colors.primary }]}>
              <Text style={{ color: colors.primary, fontWeight: "900" }}>Clear filters / फिल्टर हटाउनुहोस्</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.section, { color: colors.foreground }]}>Your clinician</Text>
        <Pressable onPress={startBooking} accessibilityRole="button" style={[styles.clinician, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.tealSurface }]}>
            <Text style={{ color: colors.primary, fontWeight: "900" }}>AO</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.serviceTitle, { color: colors.foreground }]}>Associate Professor Dr. Anil Ojha</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>MBBS, MD, FCCH · Developmental Pediatrician</Text>
            {nextDays.length ? (
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: "800" }}>
                Next open day: {nextDays[0]}{nextDayHours ? ` · ${nextDayHours}` : ""}
              </Text>
            ) : null}
          </View>
          <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
        </Pressable>

        <Pressable
          onPress={startBooking}
          disabled={!selected}
          accessibilityRole="button"
          style={[styles.primaryButton, { backgroundColor: colors.action, opacity: selected ? 1 : 0.6, marginTop: 18 }]}
        >
          <Text style={[styles.primaryButtonText, { color: colors.onAction }]}>Continue to booking / बुकिङ जारी राख्नुहोस्</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/(tabs)/appointments")} accessibilityRole="button" style={[styles.secondaryButton, { borderColor: colors.primary, marginTop: 10 }]}>
          <Text style={{ color: colors.primary, fontWeight: "900" }}>See your visits / भेटहरू हेर्नुहोस्</Text>
        </Pressable>
        <Text style={[styles.footNote, { color: colors.muted }]}>
          The clinic confirms every visit by phone or WhatsApp. For urgent help call 9765002862.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, letterSpacing: 1.4, fontWeight: "800", marginTop: 6 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "800", marginTop: 5 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 16 },
  input: { flex: 1, fontSize: 15, paddingVertical: 4 },
  chipRow: { gap: 8, paddingVertical: 12 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  section: { fontSize: 13, fontWeight: "800", letterSpacing: 0.8, marginTop: 10, marginBottom: 8 },
  serviceCard: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 9 },
  serviceTitle: { fontSize: 15, fontWeight: "800" },
  empty: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  clearButton: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignSelf: "flex-start" },
  clinician: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  primaryButton: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  primaryButtonText: { fontSize: 15, fontWeight: "900" },
  secondaryButton: { borderWidth: 1, borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  footNote: { fontSize: 12, lineHeight: 18, marginTop: 12, marginBottom: 8 },
});
