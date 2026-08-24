import Constants from "expo-constants";
import { StyleSheet, Text, View } from "react-native";
import { environmentLabel, resolveAppEnvironment } from "@/lib/app-environment";

const configuredEnvironment = Constants.expoConfig?.extra?.appEnvironment;
const isLive = resolveAppEnvironment(configuredEnvironment) === "live";

export function EnvironmentNavigationBadge() {
  const label = environmentLabel(configuredEnvironment);
  return <View accessibilityRole="text" accessibilityLabel={`${label} build context`} style={[styles.badge, isLive ? styles.live : styles.nonLive]}><Text style={[styles.text, { color: isLive ? "#0E5A36" : "#1D4E89" }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({ badge: { position: "absolute", left: 14, bottom: 72, zIndex: 20, minHeight: 30, borderRadius: 999, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1 }, live: { backgroundColor: "#E9F8EF", borderColor: "#5AB77A" }, nonLive: { backgroundColor: "#EAF2FF", borderColor: "#7AA7E5" }, text: { fontSize: 10, fontWeight: "900", letterSpacing: 0.2 } });
