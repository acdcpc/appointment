import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

type Screen = "home" | "services" | "profile" | "slots" | "confirmation";

const services = [
  { name: "Pediatric consultation", description: "Questions, symptoms, growth, and everyday child health." },
  { name: "Child development review", description: "Developmental milestones, learning, and behavioural concerns." },
  { name: "Growth & wellbeing", description: "A focused review of a child’s health and development." },
];

const slots = ["9:00 AM", "9:30 AM", "10:00 AM", "11:30 AM", "2:00 PM", "3:30 PM"];

export default function HomeScreen() {
  const colors = useColors();
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedService, setSelectedService] = useState(services[0]);
  const [selectedSlot, setSelectedSlot] = useState(slots[5]);

  const header = (title: string, subtitle: string) => (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>DR. ANIL OJHA CHILD CARE</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
      </View>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>JS</Text></View>
    </View>
  );

  if (screen === "services") {
    return <ScreenContainer className="p-5"><ScrollView showsVerticalScrollIndicator={false}>
      {header("Book a visit", "Pediatric and child development care with Dr. Ojha")}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose a service</Text>
      {services.map((service) => <Pressable key={service.name} onPress={() => { setSelectedService(service); setScreen("profile"); }} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Select ${service.name}`}>
        <View style={[styles.serviceMark, { backgroundColor: "#E0F2F3" }]}><Text style={{ color: colors.primary, fontWeight: "800" }}>+</Text></View>
        <View style={{ flex: 1, gap: 4 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{service.name}</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>{service.description}</Text></View><Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
      </Pressable>)}
      <View style={[styles.note, { borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Your clinician</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>Associate Professor Dr. Anil Ojha is the sole clinician for this practice.</Text></View>
    </ScrollView></ScreenContainer>;
  }

  if (screen === "profile") {
    return <ScreenContainer className="p-5"><ScrollView showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => setScreen("services")}><Text style={[styles.back, { color: colors.primary }]}>‹  Services</Text></Pressable>
      <View style={styles.profileHero}><View style={[styles.largeAvatar, { backgroundColor: "#E0F2F3" }]}><Text style={[styles.largeInitials, { color: colors.primary }]}>AO</Text></View><Text style={[styles.profileName, { color: colors.foreground }]}>Associate Professor Dr. Anil Ojha</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Pediatrician & Child Development Specialist</Text></View>
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>About your clinician</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>Pediatric and child-development consultations with time for questions and a practical care plan.</Text><Text style={[styles.cardMeta, { color: colors.foreground }]}>Focus: Pediatrics and child development</Text></View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Selected visit</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary }]}><View style={{ flex: 1, gap: 4 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{selectedService.name}</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>{selectedService.description}</Text></View></View>
      <Pressable onPress={() => setScreen("slots")} style={[styles.primaryButton, { backgroundColor: colors.primary }]} accessibilityRole="button"><Text style={styles.primaryButtonText}>Choose a time</Text></Pressable>
    </ScrollView></ScreenContainer>;
  }

  if (screen === "slots") {
    return <ScreenContainer className="p-5"><ScrollView showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => setScreen("profile")}><Text style={[styles.back, { color: colors.primary }]}>‹  Dr. Anil Ojha</Text></Pressable>
      <Text style={[styles.title, { color: colors.foreground }]}>Choose a time</Text><Text style={[styles.subtitle, { color: colors.muted }]}>August 20 · Clinic local time</Text>
      <View style={styles.dateRow}>{["Tue 20", "Wed 21", "Thu 22", "Fri 23"].map((day, index) => <View key={day} style={[styles.date, { borderColor: index === 0 ? colors.primary : colors.border, backgroundColor: index === 0 ? "#E0F2F3" : colors.surface }]}><Text style={[styles.dateDay, { color: colors.muted }]}>{day.split(" ")[0]}</Text><Text style={[styles.dateNumber, { color: colors.foreground }]}>{day.split(" ")[1]}</Text></View>)}</View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available times</Text><View style={styles.slotGrid}>{slots.map((slot) => <Pressable key={slot} onPress={() => setSelectedSlot(slot)} style={[styles.slot, { borderColor: selectedSlot === slot ? colors.primary : colors.border, backgroundColor: selectedSlot === slot ? colors.primary : colors.surface }]}><Text style={{ color: selectedSlot === slot ? "#FFFFFF" : colors.foreground, fontWeight: "800" }}>{slot}</Text></Pressable>)}</View>
      <View style={[styles.note, { borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Clinic visit</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>Practice location details are confirmed with the booking.</Text></View>
      <Pressable onPress={() => setScreen("confirmation")} style={[styles.primaryButton, { backgroundColor: colors.primary }]} accessibilityRole="button"><Text style={styles.primaryButtonText}>Confirm {selectedSlot}</Text></Pressable>
    </ScrollView></ScreenContainer>;
  }

  if (screen === "confirmation") {
    return <ScreenContainer className="p-5"><ScrollView showsVerticalScrollIndicator={false}>
      {header("You’re all set", "Your child’s visit has been reserved")}
      <View style={[styles.confirmation, { backgroundColor: colors.primary }]}><Text style={styles.confirmLabel}>UPCOMING VISIT</Text><Text style={styles.confirmDate}>Tue, Aug 20 · {selectedSlot}</Text><Text style={styles.confirmText}>Associate Professor Dr. Anil Ojha</Text><Text style={styles.confirmText}>{selectedService.name}</Text></View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Before you arrive</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={{ flex: 1, gap: 4 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Complete child intake form</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>Share concerns, medications, allergies, and development notes.</Text></View><Text style={{ color: colors.primary, fontSize: 22 }}>›</Text></View>
      <Pressable onPress={() => setScreen("home")} style={[styles.secondaryButton, { borderColor: colors.primary }]} accessibilityRole="button"><Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Return home</Text></Pressable>
    </ScrollView></ScreenContainer>;
  }

  return <ScreenContainer className="p-5"><ScrollView showsVerticalScrollIndicator={false}>
    {header("Welcome, Jordan", "Pediatric and child development care")}
    <View style={[styles.hero, { backgroundColor: colors.primary }]}><View style={{ flex: 1, gap: 8 }}><Text style={styles.confirmLabel}>NEXT APPOINTMENT</Text><Text style={styles.heroTitle}>Tue, Aug 20 · 3:30 PM</Text><Text style={styles.heroMeta}>Dr. Anil Ojha · Pediatric consultation</Text><Pressable onPress={() => setScreen("confirmation")} style={styles.heroButton}><Text style={{ color: colors.primary, fontWeight: "800" }}>View details</Text></Pressable></View><Text style={styles.heroMark}>+</Text></View>
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How can we help?</Text><View style={styles.quickRow}><Pressable onPress={() => setScreen("services")} style={[styles.quickCard, { backgroundColor: "#E0F2F3" }]}><Text style={[styles.quickIcon, { color: colors.primary }]}>⌕</Text><Text style={[styles.quickText, { color: colors.foreground }]}>Book a visit</Text></Pressable><Pressable onPress={() => setScreen("confirmation")} style={[styles.quickCard, { backgroundColor: "#FDE7E2" }]}><Text style={[styles.quickIcon, { color: "#C55748" }]}>▣</Text><Text style={[styles.quickText, { color: colors.foreground }]}>My visits</Text></Pressable></View>
    <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your clinician</Text><Pressable onPress={() => setScreen("profile")}><Text style={{ color: colors.primary, fontWeight: "800" }}>View profile</Text></Pressable></View>
    <Pressable onPress={() => setScreen("profile")} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.serviceMark, { backgroundColor: "#E0F2F3" }]}><Text style={{ color: colors.primary, fontWeight: "800" }}>AO</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Associate Professor Dr. Anil Ojha</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>Pediatrician & Child Development Specialist</Text><Text style={[styles.cardMeta, { color: colors.foreground }]}>Next available slot</Text></View><Text style={{ color: colors.primary, fontSize: 22 }}>›</Text></Pressable>
    <View style={[styles.note, { borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Care for every stage of childhood</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>Book a visit, complete child intake details, and keep appointments together.</Text></View>
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 24 }, eyebrow: { fontSize: 11, letterSpacing: 1.4, fontWeight: "800" }, title: { fontSize: 30, lineHeight: 36, fontWeight: "800", marginTop: 5 }, subtitle: { fontSize: 15, lineHeight: 22, marginTop: 4 }, avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" }, avatarText: { color: "#FFFFFF", fontWeight: "800" }, sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 24, marginBottom: 12 }, card: { borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }, cardTitle: { fontSize: 15, fontWeight: "800" }, cardMeta: { fontSize: 13, lineHeight: 19 }, serviceMark: { width: 48, height: 48, borderRadius: 16, justifyContent: "center", alignItems: "center" }, note: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 6, marginTop: 12 }, pressed: { opacity: 0.72 }, back: { fontSize: 15, fontWeight: "800", marginBottom: 22 }, profileHero: { alignItems: "center", gap: 6, marginBottom: 22 }, largeAvatar: { width: 96, height: 96, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 8 }, largeInitials: { fontSize: 28, fontWeight: "800" }, profileName: { fontSize: 25, textAlign: "center", lineHeight: 32, fontWeight: "800" }, infoCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 }, primaryButton: { marginTop: 24, borderRadius: 15, padding: 16, alignItems: "center" }, primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 }, dateRow: { flexDirection: "row", gap: 8, marginTop: 24 }, date: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", gap: 4 }, dateDay: { fontSize: 11, fontWeight: "700" }, dateNumber: { fontSize: 18, fontWeight: "800" }, slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, slot: { width: "31%", borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" }, confirmation: { borderRadius: 22, padding: 20, gap: 8 }, confirmLabel: { color: "#BCE7EA", fontSize: 11, letterSpacing: 1.2, fontWeight: "800" }, confirmDate: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" }, confirmText: { color: "#D7F2F3", fontSize: 14, lineHeight: 20 }, secondaryButton: { marginTop: 18, borderWidth: 1, borderRadius: 15, padding: 16, alignItems: "center" }, secondaryButtonText: { fontSize: 16, fontWeight: "800" }, hero: { borderRadius: 24, padding: 20, minHeight: 178, flexDirection: "row" }, heroTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "800", lineHeight: 27 }, heroMeta: { color: "#D7F2F3", fontSize: 14, lineHeight: 20 }, heroButton: { backgroundColor: "#FFFFFF", alignSelf: "flex-start", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 }, heroMark: { color: "#BCE7EA", fontSize: 50, fontWeight: "200" }, quickRow: { flexDirection: "row", gap: 12 }, quickCard: { flex: 1, borderRadius: 18, padding: 16, gap: 10 }, quickIcon: { fontSize: 27 }, quickText: { fontSize: 15, fontWeight: "800" }, sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
