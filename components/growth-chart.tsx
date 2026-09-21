import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

import { useColors } from "@/hooks/use-colors";
import { interpretMetric, referenceBand, referenceRange, type MetricKey, type Sex } from "@/lib/growth-interpretation";

/** Scores one plotted point with the same WHO maths the panel uses. */
function interpretPoint(metric: MetricKey, value: number, ageMonths: number, sex: Sex) {
  return interpretMetric(metric, value, ageMonths, sex);
}

export type ChartPoint = { ageMonths: number; value: number; label: string };

const STANDARD: Record<MetricKey, string> = {
  weight: "WHO weight-for-age (2006 / 2007)",
  height: "WHO length/height-for-age (2006 / 2007)",
  headCircumference: "WHO head circumference-for-age (2006)",
  bmi: "WHO BMI-for-age (2006 / 2007)",
};

/**
 * Growth chart against the WHO reference.
 *
 * Bands: -3 SD and +3 SD dashed, -2 SD and +2 SD solid, median darkest. The
 * child's own measurements are drawn in the clinic's teal. The chart refuses to
 * draw outside the age range WHO publishes for the metric, rather than
 * extrapolating a curve that does not exist.
 */
export function GrowthChart({ metric, sex, points, unit }: { metric: MetricKey; sex: Sex; points: ChartPoint[]; unit: string }) {
  const colors = useColors();
  const range = referenceRange(metric);

  if (!points.length) {
    return (
      <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800" }}>No measurements to plot yet</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>Add a measurement and it appears here against the WHO reference curves.</Text>
      </View>
    );
  }

  const ages = points.map((point) => point.ageMonths);
  const from = Math.max(range.min, Math.max(0, Math.min(...ages) - 6));
  const to = Math.min(range.max, Math.max(...ages) + 6);
  if (from >= to) {
    return (
      <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800" }}>Outside the WHO range for this metric</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{STANDARD[metric]} is published for {range.min}–{range.max} months.</Text>
      </View>
    );
  }

  const STEPS = 24;
  const samples = Array.from({ length: STEPS + 1 }, (_, index) => {
    const age = from + ((to - from) * index) / STEPS;
    return { age, band: referenceBand(metric, age, sex) };
  });

  const values = [
    ...samples.flatMap((sample) => [sample.band.minus3, sample.band.plus3]),
    ...points.filter((point) => point.ageMonths >= from && point.ageMonths <= to).map((point) => point.value),
  ];
  const low = Math.floor(Math.min(...values) * 10) / 10;
  const high = Math.ceil(Math.max(...values) * 10) / 10;
  const span = Math.max(high - low, 1);

  const width = 300;
  const height = 205;
  const plot = { left: 34, right: 250, top: 14, bottom: 150 };
  const x = (age: number) => plot.left + ((age - from) / (to - from)) * (plot.right - plot.left);
  const y = (value: number) => plot.bottom - ((value - low) / span) * (plot.bottom - plot.top);
  const line = (key: "minus3" | "minus2" | "median" | "plus2" | "plus3") => samples.map((sample) => `${x(sample.age)},${y(sample.band[key])}`).join(" ");
  const observed = points.filter((point) => point.ageMonths >= from && point.ageMonths <= to).sort((left, right) => left.ageMonths - right.ageMonths);

  const ticks = [from, from + (to - from) / 3, from + (2 * (to - from)) / 3, to].map((value) => Math.round(value));

  // Annotate the child's latest point with its own z-score and centile, so the
  // chart and the interpretation panel state the same number.
  const latest = observed[observed.length - 1];
  const labels = latest ? {
    value: latest.value,
    age: Math.round(latest.ageMonths),
    ...(() => {
      const score = interpretPoint(metric, latest.value, latest.ageMonths, sex);
      return { z: score.z ?? 0, percentile: score.percentile ?? 0 };
    })(),
  } : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{STANDARD[metric]}</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        {sex === "male" ? "Boys" : "Girls"} reference · {from}–{to} months · {unit}
      </Text>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={plot.left} y1={plot.bottom} x2={plot.right} y2={plot.bottom} stroke={colors.border} />
        <Line x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.bottom} stroke={colors.border} />
        <Polyline points={line("minus3")} fill="none" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="4 4" />
        <Polyline points={line("plus3")} fill="none" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="4 4" />
        <Polyline points={line("minus2")} fill="none" stroke="#CBD5E1" strokeWidth="1.6" />
        <Polyline points={line("plus2")} fill="none" stroke="#CBD5E1" strokeWidth="1.6" />
        <Polyline points={line("median")} fill="none" stroke="#64748B" strokeWidth="2" />
        {observed.length > 1 ? <Polyline points={observed.map((point) => `${x(point.ageMonths)},${y(point.value)}`).join(" ")} fill="none" stroke={colors.teal} strokeWidth="3" /> : null}
        {observed.map((point) => <Circle key={point.label} cx={x(point.ageMonths)} cy={y(point.value)} r="4.5" fill={colors.teal} />)}
        <SvgText x="2" y={plot.top + 8} fill={colors.muted} fontSize="10">{high}</SvgText>
        <SvgText x="2" y={(plot.top + plot.bottom) / 2 + 3} fill={colors.muted} fontSize="10">{Math.round(((high + low) / 2) * 10) / 10}</SvgText>
        <SvgText x="2" y={plot.bottom} fill={colors.muted} fontSize="10">{low}</SvgText>
        {/* Band labels sit beside their own curve, with the equivalent WHO centile,
            because a clinician reads P3 / P97 faster than a bare SD figure. */}
        <SvgText x={plot.right + 4} y={y(samples[samples.length - 1].band.plus3) + 3} fill="#94A3B8" fontSize="9">+3 SD (P99.9)</SvgText>
        <SvgText x={plot.right + 4} y={y(samples[samples.length - 1].band.plus2) + 3} fill="#64748B" fontSize="9">+2 SD (P97.7)</SvgText>
        <SvgText x={plot.right + 4} y={y(samples[samples.length - 1].band.median) + 3} fill="#475569" fontSize="9">P50</SvgText>
        <SvgText x={plot.right + 4} y={y(samples[samples.length - 1].band.minus2) + 3} fill="#64748B" fontSize="9">−2 SD (P2.3)</SvgText>
        <SvgText x={plot.right + 4} y={y(samples[samples.length - 1].band.minus3) + 3} fill="#94A3B8" fontSize="9">−3 SD (P0.1)</SvgText>
        <SvgText x={plot.left} y={plot.bottom + 18} fill={colors.muted} fontSize="9">age</SvgText>
        {ticks.map((tick, index) => <SvgText key={tick} x={x(tick)} y={plot.bottom + 18} textAnchor={index === 0 ? "start" : index === ticks.length - 1 ? "end" : "middle"} fill={colors.muted} fontSize="10">{tick}m</SvgText>)}
        {labels ? <SvgText x={plot.right} y="196" textAnchor="end" fill={colors.teal} fontSize="10" fontWeight="bold">Latest: {labels.value} {unit} at {labels.age} months · z {labels.z > 0 ? "+" : ""}{labels.z} · P{labels.percentile}</SvgText> : null}
      </Svg>
      <Text style={[styles.note, { color: colors.muted }]}>
        Dashed = ±3 SD, solid light = ±2 SD, dark = median. Teal = this child. Reference context only; not a diagnosis.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6, marginTop: 12 },
  title: { fontSize: 15, fontWeight: "900" },
  subtitle: { fontSize: 12 },
  note: { fontSize: 11, lineHeight: 16 },
  empty: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6, marginTop: 12 },
});
