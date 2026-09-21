import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { useLanguagePreference } from "@/lib/language-preference";
import { isAuthorityRole, useAuthorityRole } from "@/lib/authority-role";
import { signOutGuardian } from "@/lib/supabase-auth";
import { signOutSupabase } from "@/lib/supabase";

/**
 * Settings tab — the clinic admin panel lives here.
 *
 * The admin panel used to be reachable only from a card inside the staff home
 * screen, which on a phone was easy to miss entirely. Clinic accounts now get a
 * Settings tab (and an Admin tab) so the panel is one tap away; guardians see
 * their account settings.
 */
export default function SettingsTab() {
  const colors = useColors();
  const router = useRouter();
  const { language } = useLanguagePreference();
  const { clinicLocation } = usePediatricCare();
  const role = useAuthorityRole();
  const staff = isAuthorityRole(role);
  const signOut = async () => { await signOutGuardian(); await signOutSupabase(); router.replace("/parent-auth"); };

  const staffRows = [
    { title: language === "ne" ? "क्लिनिक एडमिन प्यानल" : "Clinic admin panel", meta: language === "ne" ? "भेट, बुकिङ अनुरोध, कर्मचारी र समय" : "Appointments, booking requests, staff and hours", route: "/clinician" },
    { title: language === "ne" ? "वृद्धि मापन" : "Growth measurements", meta: language === "ne" ? "तौल, उचाइ र शिरको परिधि" : "Weight, height and head circumference", route: "/(tabs)/growth" },
    { title: language === "ne" ? "बुकिङ अनुरोध" : "Booking requests", meta: language === "ne" ? "अभिभावकले पठाएको बच्चाको विवरण" : "Child details parents submitted", route: "/clinician" },
  ];

  return (
    <ScreenContainer className="p-5" maxWidth={980}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>RAINBOW CHILD DEVELOPMENT CLINIC</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{language === "ne" ? "सेटिङ" : "Settings"}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {staff
            ? (language === "ne" ? "क्लिनिक एडमिन प्यानल यहीँबाट खोल्नुहोस्।" : "Open the clinic admin panel from here.")
            : (language === "ne" ? "तपाईंको खाता र एप सेटिङ।" : "Your account and app settings.")}
        </Text>

        {staff ? staffRows.map((row) => (
          <Pressable key={row.title} onPress={() => router.push(row.route as never)} accessibilityRole="button" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{row.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{row.meta}</Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
          </Pressable>
        )) : (
          <>
            <Pressable onPress={() => router.push("/(tabs)/profile")} accessibilityRole="button" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{language === "ne" ? "खाता र बच्चाको विवरण" : "Account and child details"}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{language === "ne" ? "प्रोफाइलमा सम्पादन गर्नुहोस्" : "Edit in Profile"}</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(tabs)/growth")} accessibilityRole="button" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{language === "ne" ? "वृद्धि मापन" : "Growth measurements"}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{language === "ne" ? "क्लिनिकले रेकर्ड गरेका मापन" : "Values the clinic recorded"}</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
            </Pressable>
          </>
        )}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{language === "ne" ? "क्लिनिक" : "Clinic"}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{clinicLocation.address}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>9765002862 · {clinicLocation.clinicEmail}</Text>
        </View>

        <Pressable onPress={signOut} accessibilityRole="button" style={[styles.signOut, { borderColor: colors.primary }]}>
          <Text style={{ color: colors.primary, fontWeight: "900" }}>{language === "ne" ? "लग आउट" : "Sign out"}</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, letterSpacing: 1.4, fontWeight: "800", marginTop: 6 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "800", marginTop: 5 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 4, marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10, minHeight: 64 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  signOut: { borderWidth: 1, borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 18, minHeight: 48, justifyContent: "center" },
});
