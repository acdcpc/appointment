import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuthorityRole } from "@/lib/authority-role";
import { useLanguagePreference } from "@/lib/language-preference";

/**
 * Admin tab — opens the clinic admin panel.
 *
 * This tab exists so the panel is a single, obvious tap on a phone. The panel
 * itself stays at /clinician, which owns its own sign-in and access gate.
 */
export default function AdminTab() {
  const colors = useColors();
  const router = useRouter();
  const role = useAuthorityRole();
  const { language } = useLanguagePreference();

  useEffect(() => {
    if (role === "loading") return;
    router.replace(role === "guardian" ? "/(tabs)" : "/clinician");
  }, [role, router]);

  return (
    <ScreenContainer className="items-center justify-center">
      <View style={styles.wrap}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.text, { color: colors.muted }]}>
          {language === "ne" ? "क्लिनिक एडमिन प्यानल खोल्दै…" : "Opening the clinic admin panel…"}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 12 },
  text: { fontSize: 14, fontWeight: "700" },
});
