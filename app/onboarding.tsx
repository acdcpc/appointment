import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { bilingualText, useLanguagePreference } from "@/lib/language-preference";

/**
 * First-run onboarding — the app's entry screen for signed-out visitors.
 * Introduces the clinic, what the app does, and the privacy promise, then
 * routes to parent sign-in (Supabase email + password) or lets the visitor
 * explore the app without an account. Booking works without an account;
 * records/reports require a verified guardian account.
 */
export default function Onboarding() {
  const colors = useColors();
  const router = useRouter();
  const { language } = useLanguagePreference();
  const t = (english: string, nepali: string) => bilingualText(language, english, nepali);

  const features: Array<{ icon: string; title: string; titleNe: string; body: string; bodyNe: string }> = [
    {
      icon: "📅",
      title: "Book and manage visits",
      titleNe: "भेट्ने समय मिलाउनुहोस्",
      body: "Choose a visit type, see real availability, confirm or reschedule — no phone queue.",
      bodyNe: "भेटको प्रकार छान्नुहोस्, उपलब्ध समय हेर्नुहोस्, पुष्टि वा परिवर्तन गर्नुहोस् — फोन लाइन बिना।",
    },
    {
      icon: "🔔",
      title: "Stay updated",
      titleNe: "अपडेटमा रहनुहोस्",
      body: "Modified clinic hours, reschedule confirmations, and earlier-slot offers appear right here.",
      bodyNe: "क्लिनिक समय परिवर्तन, भेट पुष्टि, र अझै सुरुका समयका प्रस्ताव यहीँ देखिन्छन्।",
    },
    {
      icon: "🔒",
      title: "Private by design",
      titleNe: "गोपनीयता सुरक्षित",
      body: "Your child's records are visible only to the guardian account linked by the clinic.",
      bodyNe: "तपाईंको बच्चाको रेकर्ड क्लिनिकले जोडेको अभिभावक खाताले मात्र देख्न पाउँछ।",
    },
  ];

  return (
    <ScreenContainer style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Image source={require("../assets/images/icon.png")} style={styles.logoImage} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("Rainbow Child Development Clinic", "रेन्बो चाइल्ड डेभलपमेन्ट क्लिनिक")}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {t(
            "Appointments, updates, and your child's records — in one place.",
            "भेट, सूचना, र बच्चाको रेकर्ड — सबै एउटै ठाउँमा।"
          )}
        </Text>
      </View>

      <View style={[styles.doctorBanner, { backgroundColor: colors.tealSurface, borderColor: colors.primary }]}>
        <View style={[styles.doctorBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.doctorBadgeText, { color: colors.textInverse }]}>Dr</Text>
        </View>
        <View style={styles.flexCopy}>
          <Text style={[styles.doctorName, { color: colors.foreground }]}>Associate Professor Dr. Anil Ojha</Text>
          <Text style={[styles.doctorMeta, { color: colors.muted }]}>MBBS, MD, FCCH · Developmental Pediatrician</Text>
        </View>
      </View>

      <View style={styles.features}>
        {features.map((f) => (
          <View key={f.icon} style={[styles.featureRow, { borderColor: colors.border }]}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>
                {t(f.title, f.titleNe)}
              </Text>
              <Text style={[styles.featureBody, { color: colors.muted }]}>
                {t(f.body, f.bodyNe)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push("/parent-auth")}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={t("Get started with a guardian account", "अभिभावक खातासँग सुरु गर्नुहोस्")}
        >
          <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>{t("Get started", "सुरु गरौँ")}</Text>
          <Text style={[styles.primaryButtonNepali, { color: colors.textInverseMuted }]}>
            {t("Create an account or sign in", "खाता बनाउनुहोस् वा लग इन गर्नुहोस्")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)")}
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={t("Explore the app without an account", "खाता बिना एप हेर्नुहोस्")}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.muted }]}>
            {t("Explore the app first", "पहिले एप हेरौँ")}
          </Text>
        </Pressable>
        <Text style={[styles.privacyNote, { color: colors.muted }]}>
          {t(
            "Booking works without an account. Records and reports open only after the clinic links your verified guardian account.",
            "खाता बिना पनि भेट मिलाउन मिल्छ। रेकर्ड र रिपोर्ट क्लिनिकले खाता जोडेपछि मात्र खुल्छन्।"
          )}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    gap: 24,
    paddingVertical: 32,
  },
  hero: {
    alignItems: "center",
    gap: 10,
  },
  logoImage: {
    width: 76,
    height: 76,
    borderRadius: 19,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  features: {
    gap: 10,
  },
  doctorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  doctorBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorBadgeText: {
    fontWeight: "900",
    fontSize: 13,
  },
  flexCopy: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: "900",
  },
  doctorMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
  featureRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  featureBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "900",
  },
  primaryButtonNepali: {
    opacity: 0.85,
    lineHeight: 20,
    fontSize: 12,
    marginTop: 2,
  },
  secondaryButton: {
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  privacyNote: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 8,
  },
});
