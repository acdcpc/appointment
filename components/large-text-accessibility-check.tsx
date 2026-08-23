import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { getStructuredLargeTextChecks } from "@/lib/large-text-layout";
import { useLargeTextLayout } from "@/lib/large-text-accessibility";

/** Reports the actual font scale supplied by the active device and the deterministic layout criteria used by the app. */
export function LargeTextAccessibilityCheck() {
  const colors = useColors();
  const { fontScale } = useLargeTextLayout();
  const checks = getStructuredLargeTextChecks(fontScale);
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.title, { color: colors.foreground }]}>Large-text accessibility check</Text>
    <Text style={[styles.body, { color: colors.muted }]}>Current device font scale: {checks.observed.fontScale.toFixed(1)}×. This screen reads the active device setting; it does not infer a device test from a web preview.</Text>
    <View style={styles.rows}>{checks.targets.map((check) => <View key={check.fontScale} style={[styles.row, { borderColor: colors.border }]}><Text style={[styles.scale, { color: colors.foreground }]}>{check.fontScale.toFixed(1)}×</Text><Text style={[styles.body, { color: colors.muted, flex: 1 }]}>{check.minimumActionHeight}px minimum action height · {check.denseRowsStack ? "dense rows stack" : "standard row layout"}</Text><Text style={{ color: check.passes ? colors.success : colors.error, fontWeight: "800" }}>{check.passes ? "Pass" : "Review"}</Text></View>)}</View>
    <Text style={[styles.body, { color: colors.muted }]}>For a physical-device review, set iOS or Android text size to 1.3×, 1.6×, and 2.0×, then confirm that the parent home, appointment creation, guardian verification, records, and clinician shortcuts remain readable and reachable.</Text>
  </View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 9, marginTop: 12 }, title: { fontSize: 16, fontWeight: "800" }, body: { fontSize: 13, lineHeight: 19 }, rows: { gap: 6 }, row: { minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }, scale: { fontSize: 14, fontWeight: "800", minWidth: 38 } });
