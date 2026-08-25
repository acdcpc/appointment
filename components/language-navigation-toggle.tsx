import { Pressable, StyleSheet, Text } from "react-native";
import { useLanguagePreference } from "@/lib/language-preference";

export function LanguageNavigationToggle() {
  const { language, toggleLanguage } = useLanguagePreference();
  const next = language === "en" ? "नेपाली" : "English";
  return <Pressable onPress={toggleLanguage} accessibilityRole="switch" accessibilityState={{ checked: language === "ne" }} accessibilityLabel={`Language: ${language === "en" ? "English" : "Nepali"}. Switch to ${next}.`} style={styles.control}><Text style={styles.text}>{language === "en" ? "EN · नेपाली" : "ने · English"}</Text></Pressable>;
}

const styles = StyleSheet.create({ control: { position: "absolute", right: 14, bottom: 112, zIndex: 20, minHeight: 32, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#E0F2F3", borderWidth: 1, borderColor: "#0E7A8C", justifyContent: "center" }, text: { color: "#0E5A6A", fontSize: 10, fontWeight: "900" } });
