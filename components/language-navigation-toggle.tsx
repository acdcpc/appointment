import { Pressable, StyleSheet, Text } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { useLanguagePreference } from "@/lib/language-preference";

export function LanguageNavigationToggle() {
  const { language, toggleLanguage } = useLanguagePreference();
  const next = language === "en" ? "नेपाली" : "English";
  const colors = useColors();
  return <Pressable onPress={toggleLanguage} accessibilityRole="switch" accessibilityState={{ checked: language === "ne" }} accessibilityLabel={`Language: ${language === "en" ? "English" : "Nepali"}. Switch to ${next}.`} style={[styles.control, { backgroundColor: colors.tealSurface, borderColor: colors.teal }]}><Text style={[styles.text, { color: colors.teal }]}>{language === "en" ? "EN · नेपाली" : "ने · English"}</Text></Pressable>;
}

const styles = StyleSheet.create({ control: { position: "absolute", right: 14, bottom: 112, zIndex: 20, minHeight: 36, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, justifyContent: "center" }, text: { fontSize: 11, fontWeight: "900" } });
