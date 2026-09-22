import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { GrowthChart, type ChartPoint } from "@/components/growth-chart";
import { GrowthMeasurementEntry } from "@/components/growth-measurement-entry";
import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { isAuthorityRole, useAuthorityRole } from "@/lib/authority-role";
import { interpretMeasurement, referenceBand, referenceRange, type MetricKey } from "@/lib/growth-interpretation";
import { buildGrowthTrend, type TrendVisit } from "@/lib/growth-trend";

/**
 * Growth tab — WHO chart and clinical interpretation.
 *
 * Built for the clinic, so the wording is clinical and in English: each metric is
 * scored with the exact WHO LMS z-score, placed in its WHO z-band, and named with
 * the WHO classification for that band. Recorded values are plotted against the
 * published reference curves. This is decision support, not a diagnosis.
 */
const METRICS: Array<{ key: MetricKey; label: string; unit: string; field: "weightKg" | "heightCm" | "headCircumferenceCm" | "bmi" }> = [
  { key: "weight", label: "Weight", unit: "kg", field: "weightKg" },
  { key: "height", label: "Length / height", unit: "cm", field: "heightCm" },
  { key: "headCircumference", label: "Head circumference", unit: "cm", field: "headCircumferenceCm" },
  { key: "bmi", label: "BMI", unit: "kg/m²", field: "bmi" },
];

/** Compact "Weight +0.6 kg (Δz −0.3), Height +1.2 cm (Δz −0.1)" line for history rows. */
function trendLine(trend: ReturnType<typeof buildGrowthTrend>): string {
  return trend.metrics
    .filter((entry) => entry.change !== undefined)
    .map((entry) => `${entry.label.split("-")[0]} ${entry.change! > 0 ? "+" : entry.change === 0 ? "±" : ""}${entry.change} ${entry.unit}${entry.deltaZ !== undefined ? ` (Δz ${entry.deltaZ > 0 ? "+" : ""}${entry.deltaZ})` : ""}`)
    .join(" · ");
}

const BAND_COLOUR = { "severe-low": "error", "severe-high": "error", low: "warning", high: "warning", normal: "success", undefined: "muted" } as const;

export default function GrowthTab() {
  const colors = useColors();
  const { activeChild, growthMetrics } = usePediatricCare();
  const role = useAuthorityRole();
  const canRecord = isAuthorityRole(role);
  const [metric, setMetric] = useState<MetricKey>("weight");

  const measurements = useMemo(
    () => growthMetrics
      .filter((item) => item.childId === activeChild.id)
      .sort((left, right) => left.ageMonths - right.ageMonths),
    [activeChild.id, growthMetrics],
  );
  const latest = measurements[measurements.length - 1];
  const ageMonths = latest?.ageMonths ?? 0;

  const bmiOf = (item: typeof latest) => item && item.weightKg !== undefined && item.heightCm !== undefined && item.heightCm > 0
    ? Math.round((item.weightKg / Math.pow(item.heightCm / 100, 2)) * 10) / 10
    : undefined;

  const points: ChartPoint[] = useMemo(() => measurements
    .map((item) => {
      const value = metric === "bmi" ? bmiOf(item)
        : metric === "weight" ? item.weightKg
          : metric === "height" ? item.heightCm
            : item.headCircumferenceCm;
      return value === undefined ? null : { ageMonths: item.ageMonths, value, label: item.occurredOn };
    })
    .filter((point): point is ChartPoint => point !== null), [measurements, metric]);

  const interpretation = useMemo(() => latest ? interpretMeasurement({
    ageMonths,
    sex: activeChild.sex,
    weightKg: latest.weightKg,
    heightCm: latest.heightCm,
    headCircumferenceCm: latest.headCircumferenceCm,
  }) : null, [activeChild.sex, ageMonths, latest]);

  const toVisit = (item: (typeof measurements)[number] | undefined): TrendVisit | null => item ? {
    occurredOn: item.occurredOn,
    ageMonths: item.ageMonths,
    weightKg: item.weightKg,
    heightCm: item.heightCm,
    headCircumferenceCm: item.headCircumferenceCm,
  } : null;

  // Visit-to-visit comparison: the change matters more than any single reading,
  // because a child can stay inside the normal range while falling across centiles.
  const previous = measurements.length >= 2 ? measurements[measurements.length - 2] : undefined;
  const previousVisit = toVisit(previous);
  const latestVisit = toVisit(latest);
  const trend = previousVisit && latestVisit ? buildGrowthTrend({ sex: activeChild.sex, previous: previousVisit, current: latestVisit }) : null;

  const bands = latest ? referenceBand(metric, ageMonths, activeChild.sex) : null;
  const whoRange = referenceRange(metric);
  const activeMetric = METRICS.find((entry) => entry.key === metric)!;

  const colourFor = (band: keyof typeof BAND_COLOUR) => {
    const key = BAND_COLOUR[band];
    return key === "error" ? colors.error : key === "warning" ? colors.warning : key === "success" ? colors.success : colors.muted;
  };

  return (
    <ScreenContainer className="p-5" maxWidth={980}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>RAINBOW CHILD DEVELOPMENT CLINIC</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Growth — WHO reference</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {activeChild.name} · {activeChild.sex === "male" ? "Male" : "Female"} · date of birth {activeChild.dateOfBirth || "not recorded"}
          {ageMonths ? ` · ${Math.floor(ageMonths / 12)} y ${ageMonths % 12} m at the latest measurement` : ""}
        </Text>

        {!activeChild.dateOfBirth ? (
          <View style={[styles.notice, { borderColor: colors.warning, backgroundColor: colors.warningSurface }]}>
            <Text style={{ color: colors.warning, fontWeight: "900", fontSize: 13 }}>Date of birth required</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>WHO z-scores need the child’s age. Add the date of birth before the interpretation can be scored.</Text>
          </View>
        ) : null}

        {canRecord ? <GrowthMeasurementEntry /> : null}

        <View style={styles.metricRow}>
          {METRICS.map((entry) => {
            const selected = entry.key === metric;
            return (
              <Pressable key={entry.key} onPress={() => setMetric(entry.key)} accessibilityRole="tab" accessibilityState={{ selected }} style={[styles.metricTab, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.tealSurface : colors.surface }]}>
                <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: "900", fontSize: 13 }}>{entry.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <GrowthChart metric={metric} sex={activeChild.sex} points={points} unit={activeMetric.unit} />

        {latest ? (
          <>
            <Text style={[styles.section, { color: colors.foreground }]}>Clinical interpretation — latest measurement ({latest.occurredOn})</Text>
            {interpretation ? (
              <>
                <View style={[styles.summaryCard, { borderColor: interpretation.flags.length ? colors.warning : colors.success, backgroundColor: interpretation.flags.length ? colors.warningSurface : colors.successSurface }]}>
                  <Text style={{ color: interpretation.flags.length ? colors.warning : colors.success, fontWeight: "900", fontSize: 14 }}>{interpretation.summary}</Text>
                  {interpretation.flags.length ? interpretation.flags.map((flag) => (
                    <Text key={flag} style={{ color: colors.foreground, fontSize: 13 }}>• {flag}</Text>
                  )) : (
                    <Text style={{ color: colors.foreground, fontSize: 13 }}>No measurement falls outside the WHO ±2 SD range for {activeChild.sex === "male" ? "boys" : "girls"} at this age.</Text>
                  )}
                </View>

                {interpretation.metrics.map((entry) => (
                  <View key={entry.metric} style={[styles.metricCard, { borderColor: colors.border, backgroundColor: colors.surface, borderLeftColor: colourFor(entry.band), borderLeftWidth: 4 }]}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 14 }}>{entry.label}</Text>
                      <Text style={{ color: colors.muted, fontSize: 13 }}>
                        {entry.value !== undefined ? `${entry.value} ${entry.unit}` : "not recorded"}
                        {entry.z !== undefined ? ` · z ${entry.z > 0 ? "+" : ""}${entry.z} · percentile ${entry.percentile}` : ""}
                      </Text>
                      <Text style={{ color: colourFor(entry.band), fontSize: 13, fontWeight: "800" }}>{entry.classification}</Text>
                      {entry.note ? <Text style={{ color: colors.muted, fontSize: 12 }}>{entry.note}</Text> : null}
                    </View>
                  </View>
                ))}

                {trend ? (
                  <>
                    <Text style={[styles.section, { color: colors.foreground }]}>Change since the previous visit — {trend.previousOn} → {trend.currentOn} ({trend.days} days)</Text>
                    <View style={[styles.summaryCard, { borderColor: trend.flags.length ? colors.warning : colors.success, backgroundColor: trend.flags.length ? colors.warningSurface : colors.successSurface }]}>
                      <Text style={{ color: trend.flags.length ? colors.warning : colors.success, fontWeight: "900", fontSize: 14 }}>{trend.summary}</Text>
                      {trend.flags.map((flag) => <Text key={flag} style={{ color: colors.foreground, fontSize: 13 }}>• {flag}</Text>)}
                    </View>
                    {trend.metrics.map((entry) => (
                      <View key={entry.metric} style={[styles.metricCard, { borderColor: colors.border, backgroundColor: colors.surface, borderLeftColor: entry.direction === "worsening" ? colors.error : entry.direction === "improving" ? colors.success : colors.muted, borderLeftWidth: 4 }]}>
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 14 }}>{entry.label}</Text>
                          <Text style={{ color: colors.muted, fontSize: 13 }}>{entry.statement}</Text>
                          {entry.deltaZ !== undefined ? (
                            <Text style={{ color: entry.direction === "worsening" ? colors.error : entry.direction === "improving" ? colors.success : colors.muted, fontSize: 13, fontWeight: "800" }}>
                              {entry.direction === "worsening" ? "Downward crossing of the WHO bands — review" : entry.direction === "improving" ? "Upward movement across the WHO bands" : "Tracking along the same WHO band"}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </>
                ) : latest ? (
                  <View style={[styles.notice, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 13 }}>First measurement for {activeChild.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>There is nothing to compare against yet. Record the next visit and the change in values, rate and WHO z-score appears here automatically.</Text>
                  </View>
                ) : null}

                {bands ? (
                  <View style={[styles.notice, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 13 }}>WHO reference values at {ageMonths} months ({activeMetric.label.toLowerCase()})</Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                      −2 SD {bands.minus2} · median {bands.median} · +2 SD {bands.plus2} {activeMetric.unit}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      Published range for this metric: {whoRange.min}–{whoRange.max} months.
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.foreground, fontWeight: "800" }}>No measurements recorded yet</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {canRecord ? "Record the first weight, height or head circumference above." : "The clinic records these values; they appear here after the first visit."}
            </Text>
          </View>
        )}

        <Text style={[styles.section, { color: colors.foreground }]}>Recorded measurements</Text>
        {measurements.length ? [...measurements].reverse().map((item) => {
          const rowBmi = bmiOf(item);
          const rowInterpretation = interpretMeasurement({
            ageMonths: item.ageMonths,
            sex: activeChild.sex,
            weightKg: item.weightKg,
            heightCm: item.heightCm,
            headCircumferenceCm: item.headCircumferenceCm,
          });
          const rowFlags = rowInterpretation.metrics.filter((entry) => entry.z !== undefined && (entry.band === "low" || entry.band === "high" || entry.band === "severe-low" || entry.band === "severe-high"));
          const index = measurements.findIndex((entry) => entry.id === item.id);
          const previousRow = index > 0 ? toVisit(measurements[index - 1]) : null;
          const rowChange = previousRow ? trendLine(buildGrowthTrend({
            sex: activeChild.sex,
            previous: previousRow,
            current: toVisit(item)!,
          })) : null;
          return (
            <View key={item.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 14 }}>{item.occurredOn} · {item.ageMonths} months</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {[
                    item.weightKg !== undefined ? `Weight ${item.weightKg} kg` : null,
                    item.heightCm !== undefined ? `Height ${item.heightCm} cm` : null,
                    item.headCircumferenceCm !== undefined ? `Head ${item.headCircumferenceCm} cm` : null,
                    rowBmi !== undefined ? `BMI ${rowBmi}` : null,
                  ].filter(Boolean).join(" · ") || "No values recorded"}
                </Text>
                <Text style={{ color: rowFlags.length ? colors.warning : colors.success, fontSize: 12, fontWeight: "800" }}>
                  {rowFlags.length ? rowFlags.map((entry) => `${entry.label}: ${entry.band.replace("-", " ")}`).join(" · ") : "All scored metrics within ±2 SD"}
                </Text>
                {rowChange ? <Text style={{ color: colors.muted, fontSize: 12 }}>vs previous visit: {rowChange}</Text> : null}
                {item.note ? <Text style={{ color: colors.muted, fontSize: 12 }}>{item.note}</Text> : null}
              </View>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>{item.recordedRole === "guardian" ? "Parent-reported" : "Clinic"}</Text>
            </View>
          );
        }) : <Text style={{ color: colors.muted, fontSize: 13 }}>Nothing recorded yet.</Text>}

        <Text style={[styles.footNote, { color: colors.muted }]}>
          Scored with the exact WHO LMS method against the WHO Child Growth Standards (0–60 months) and WHO Growth Reference (61–216 months).
          Weight-for-age is defined to 10 years, head circumference to 5 years. Interpretation supports, and does not replace, clinical judgement.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, letterSpacing: 1.4, fontWeight: "800", marginTop: 6 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "800", marginTop: 5 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 4 },
  notice: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 5, marginTop: 12 },
  metricRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 20 },
  metricTab: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: "center" },
  section: { fontSize: 13, fontWeight: "800", letterSpacing: 0.8, marginTop: 22, marginBottom: 8 },
  summaryCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 5 },
  metricCard: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", gap: 10, marginTop: 9 },
  row: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 9, flexWrap: "wrap" },
  empty: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6, marginTop: 12 },
  footNote: { fontSize: 11, lineHeight: 17, marginTop: 18, marginBottom: 8 },
});
