import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { usePathname } from "expo-router";

import { SuperAdminServiceSuggestions } from "@/components/super-admin-service-suggestions";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function SuperAdminServiceSuggestionWorkspace() {
  const colors = useColors(); const pathname = usePathname(); const [open, setOpen] = useState(false); const authority = trpc.auth.authority.useQuery();
  if (pathname !== "/super-admin" || authority.data?.authority !== "super-admin") return null;
  return <><Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Review service suggestions" style={[styles.launch, { backgroundColor: colors.primary }]}><Text style={styles.launchText}>Suggestions</Text></Pressable><Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}><View style={[styles.page, { backgroundColor: colors.background }]}><Pressable onPress={() => setOpen(false)} style={[styles.close, { borderColor: colors.border }]}><View style={[styles.closeLine, { backgroundColor: colors.muted }]} /></Pressable><SuperAdminServiceSuggestions /></View></Modal></>;
}

const styles = StyleSheet.create({ launch: { position: "absolute", right: 14, bottom: 154, zIndex: 22, minHeight: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", paddingHorizontal: 12 }, launchText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" }, page: { flex: 1, paddingHorizontal: 18, paddingTop: 58 }, close: { width: 46, height: 34, borderWidth: 1, borderRadius: 17, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", marginBottom: 4 }, closeLine: { width: 18, height: 2, borderRadius: 2 } });
