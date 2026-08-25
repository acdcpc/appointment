import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";

export function ClinicianDeploymentFeedbackLink() {
  const colors = useColors(); const router = useRouter();
  return <Pressable onPress={() => router.push("/deployment-feedback" as never)} accessibilityRole="button" style={[styles.button, { borderColor: colors.primary, backgroundColor: colors.surface }]}><Text style={{ color: colors.primary, fontWeight: "900" }}>Report a live-test issue</Text><Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15 }}>Send factual deployment feedback for super-admin review. It does not send a message automatically or resolve the issue.</Text></Pressable>;
}
const styles = StyleSheet.create({ button: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 3, marginTop: 12 } });
