import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { WhoGrowthReferenceChart } from "@/components/who-growth-reference-chart";

export function ActiveGrowthReference() {
  const colors = useColors(); const { activeChild, growthMetrics } = usePediatricCare(); const measurements = growthMetrics.filter((item) => item.childId === activeChild.id);
  const hasHeightReference = measurements.some((item) => item.ageMonths >= 24 && item.ageMonths <= 228); const hasWeightReference = measurements.some((item) => item.ageMonths >= 24 && item.ageMonths <= 120);
  return <View style={styles.wrap}><Text style={[styles.title, { color: colors.foreground }]}>WHO growth reference context</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Shown for {activeChild.name} using recorded age-in-months and sex. Dr. Ojha should interpret all information clinically.</Text>{hasHeightReference ? <View style={styles.charts}><WhoGrowthReferenceChart sex={activeChild.sex} measurements={measurements} metric="heightCm" title="Height and WHO reference curves" />{hasWeightReference ? <WhoGrowthReferenceChart sex={activeChild.sex} measurements={measurements} metric="weightKg" title="Weight and WHO reference curves" /> : <View style={[styles.unavailable, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={{ color: colors.muted }}>WHO weight-for-age reference data are not shown after 10 years. The factual weight trend remains available above.</Text></View>}</View> : <View style={[styles.unavailable, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={{ color: colors.muted }}>Verified reference curves are available for height between 24 and 228 months in this prototype. Keep the factual trend charts for this child outside that range.</Text></View>}</View>;
}

const styles = StyleSheet.create({ wrap: { gap: 8 }, title: { fontSize: 18, fontWeight: "800", marginTop: 24 }, subtitle: { fontSize: 13, lineHeight: 19 }, charts: { gap: 10 }, unavailable: { borderWidth: 1, borderRadius: 14, padding: 13 }, });
