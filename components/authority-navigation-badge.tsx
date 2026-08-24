import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function AuthorityNavigationBadge() {
  const colors = useColors(); const router = useRouter(); const authority = trpc.auth.authority.useQuery();
  if (!authority.data) return null;
  const label = authority.data.authority === "super-admin" ? "Super-Admin" : authority.data.authority === "clinic-admin" || authority.data.applicationRole === "admin" ? "Admin" : null;
  if (!label) return null;
  return <Pressable onPress={() => authority.data?.authority === "super-admin" ? router.push("/super-admin" as never) : router.push("/clinician" as never)} accessibilityRole="button" accessibilityLabel={`${label} access badge`} style={[styles.badge, { borderColor: label === "Super-Admin" ? colors.warning : colors.primary, backgroundColor: colors.surface }]}><Text style={{ color: label === "Super-Admin" ? colors.warning : colors.primary, fontSize: 11, fontWeight: "900" }}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({ badge: { position: "absolute", right: 14, bottom: 72, zIndex: 20, borderWidth: 1, borderRadius: 999, minHeight: 34, justifyContent: "center", paddingHorizontal: 12 } });
