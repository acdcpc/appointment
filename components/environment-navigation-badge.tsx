import Constants from "expo-constants";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { environmentLabel, resolveAppEnvironment } from "@/lib/app-environment";
import { safeAppVersion, safeReleaseNotes } from "@/lib/release-context";

const configuredEnvironment = Constants.expoConfig?.extra?.appEnvironment;
const isLive = resolveAppEnvironment(configuredEnvironment) === "live";

export function EnvironmentNavigationBadge() {
  const [open, setOpen] = useState(false); const label = environmentLabel(configuredEnvironment); const version = safeAppVersion(Constants.expoConfig?.version); const releaseNotes = safeReleaseNotes(Constants.expoConfig?.extra?.releaseNotes);
  return <><Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${label} build context. Show release details.`} style={[styles.badge, isLive ? styles.live : styles.nonLive]}><Text style={[styles.text, { color: isLive ? "#0E5A36" : "#1D4E89" }]}>{label}</Text></Pressable><Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}><View style={styles.backdrop}><View style={styles.modal}><Text style={styles.title}>{label}</Text><Text style={styles.detail}>App version: {version}</Text><Text style={styles.detail}>Deployment notes: {releaseNotes}</Text><Text style={styles.note}>This describes configured build context only. It does not confirm service health, deployment completion, data status, authorization, or security posture.</Text><Pressable onPress={() => setOpen(false)} style={styles.close}><Text style={styles.closeText}>Close</Text></Pressable></View></View></Modal></>;
}

const styles = StyleSheet.create({ badge: { position: "absolute", left: 14, bottom: 72, zIndex: 20, minHeight: 30, borderRadius: 999, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1 }, live: { backgroundColor: "#E9F8EF", borderColor: "#5AB77A" }, nonLive: { backgroundColor: "#EAF2FF", borderColor: "#7AA7E5" }, text: { fontSize: 10, fontWeight: "900", letterSpacing: 0.2 }, backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.48)", justifyContent: "center", padding: 22 }, modal: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, gap: 10, borderWidth: 1, borderColor: "#D7E0E5" }, title: { color: "#112B35", fontSize: 18, fontWeight: "900" }, detail: { color: "#29434C", fontSize: 13, lineHeight: 19 }, note: { color: "#5A6B73", fontSize: 11, lineHeight: 16 }, close: { minHeight: 42, backgroundColor: "#0E7A8C", borderRadius: 10, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 16 }, closeText: { color: "#FFFFFF", fontWeight: "900" } });
