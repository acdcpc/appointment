import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

import { useColors } from "@/hooks/use-colors";
import { referenceBand, referenceRange, type MetricKey, type Sex } from "@/lib/growth-interpretation";

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
  const height = 170;
  const plot = { left: 34, right: 288, top: 12, bottom: 138 };
  const x = (age: number) => plot.left + ((age - from) / (to - from)) * (plot.right - plot.left);
  const y = (value: number) => plot.bottom - ((value - low) / span) * (plot.bottom - plot.top);
  const line = (key: "minus3" | "minus2" | "median" | "plus2" | "plus3") => samples.map((sample) => `${x(sample.age)},${y(sample.band[key])}`).join(" ");
  const observed = points.filter((point) => point.ageMonths >= from && point.ageMonths <= to).sort((left, right) => left.ageMonths - right.ageMonths);

  const ticks = [from, from + (to - from) / 3, from + (2 * (to - from)) / 3, to].map((value) => Math.round(value));

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
        <SvgText x="2" y={plot.top + 8} fill={colors.muted} fontSize="9">{high}</SvgText>
        <SvgText x="2" y={plot.bottom} fill={colors.muted} fontSize="9">{low}</SvgText>
        <SvgText x={plot.right} y="152" textAnchor="end" fill="#64748B" fontSize="9">+3 SD</SvgText>
        <SvgText x={plot.right} y="164" textAnchor="end" fill="#64748B" fontSize="9">median</SvgText>
        <SvgText x={plot.right} y="176" textAnchor="end" fill="#64748B" fontSize="9">−3 SD</SvgText>
        {ticks.map((tick) => <SvgText key={tick} x={x(tick)} y="152" textAnchor="middle" fill={colors.muted} fontSize="9">{tick}m</SvgText>)}
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
