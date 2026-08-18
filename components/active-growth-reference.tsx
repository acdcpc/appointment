import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { WhoGrowthReferenceChart } from "@/components/who-growth-reference-chart";

export function ActiveGrowthReference() {
  const colors = useColors(); const { activeChild, growthMetrics } = usePediatricCare(); const measurements = growthMetrics.filter((item) => item.childId === activeChild.id);
  return <View style={styles.wrap}><Text style={[styles.title, { color: colors.foreground }]}>WHO growth reference context</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Shown for {activeChild.name} using recorded age-in-months and sex. Dr. Ojha should interpret all information clinically.</Text>{measurements.some((item) => item.ageMonths >= 24 && item.ageMonths <= 60) ? <View style={styles.charts}><WhoGrowthReferenceChart sex={activeChild.sex} measurements={measurements} metric="heightCm" title="Height and WHO reference curves" /><WhoGrowthReferenceChart sex={activeChild.sex} measurements={measurements} metric="weightKg" title="Weight and WHO reference curves" /></View> : <View style={[styles.unavailable, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={{ color: colors.muted }}>Reference curves are available in this prototype only for measurements recorded between 24 and 60 months. Keep the factual trend charts for this child and use the verified WHO source in the clinician workflow for other ages.</Text></View>}</View>;
}

const styles = StyleSheet.create({ wrap: { gap: 8 }, title: { fontSize: 18, fontWeight: "800", marginTop: 24 }, subtitle: { fontSize: 13, lineHeight: 19 }, charts: { gap: 10 }, unavailable: { borderWidth: 1, borderRadius: 14, padding: 13 }, });
