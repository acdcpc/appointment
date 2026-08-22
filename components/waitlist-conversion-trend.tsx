import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

export function WaitlistConversionTrend() {
  const colors = useColors();
  const { earlierSlotRequests } = usePediatricCare();
  const [rangeMonths, setRangeMonths] = useState<3 | 6 | 12>(6);
  const months = Array.from({ length: rangeMonths }, (_, index) => {
    const date = new Date();
    date.setDate(1); date.setHours(0, 0, 0, 0); date.setMonth(date.getMonth() - (rangeMonths - 1 - index));
    const end = new Date(date); end.setMonth(end.getMonth() + 1);
    const offers = earlierSlotRequests.filter((item) => item.offer && Date.parse(item.offer.offeredAt) >= date.getTime() && Date.parse(item.offer.offeredAt) < end.getTime());
    const converted = offers.filter((item) => item.status === "converted").length;
    return { key: date.toISOString(), label: date.toLocaleString(undefined, { month: "short" }), offered: offers.length, converted, rate: offers.length ? Math.round((converted / offers.length) * 100) : 0 };
  });
  const max = Math.max(1, ...months.map((month) => month.offered));
  const latest = months.at(-1); const previous = months.at(-2); const delta = (latest?.rate ?? 0) - (previous?.rate ?? 0);
  const totalOffers = months.reduce((sum, month) => sum + month.offered, 0);
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.title, { color: colors.foreground }]}>Waitlist conversion trend</Text>
    <Text style={[styles.note, { color: colors.muted }]}>Aggregate operational comparison. Rates are descriptive, not predictive.</Text>
    <View style={styles.rangeRow}>{([3, 6, 12] as const).map((value) => <Pressable key={value} onPress={() => setRangeMonths(value)} style={[styles.rangeButton, { borderColor: value === rangeMonths ? colors.primary : colors.border, backgroundColor: value === rangeMonths ? colors.primary : "transparent" }]}><Text style={{ color: value === rangeMonths ? "#FFFFFF" : colors.foreground, fontWeight: "800", fontSize: 11 }}>{value} months</Text></Pressable>)}</View>
    {totalOffers ? <><View style={styles.chart}>{months.map((month) => <View key={month.key} style={styles.column}><View style={styles.bars}><View style={[styles.offered, { height: `${Math.max(5, (month.offered / max) * 100)}%`, backgroundColor: colors.primary }]} /><View style={[styles.converted, { height: `${Math.max(3, (month.converted / max) * 100)}%`, backgroundColor: colors.success }]} /></View><Text style={[styles.month, { color: colors.muted }]}>{month.label}</Text><Text style={[styles.rate, { color: colors.foreground }]}>{month.rate}%</Text></View>)}</View><Text style={[styles.note, { color: delta > 0 ? colors.success : delta < 0 ? colors.warning : colors.muted }]}>{delta === 0 ? "Conversion rate is unchanged from the prior month." : `${Math.abs(delta)} percentage point ${delta > 0 ? "increase" : "decrease"} from the prior month.`}</Text><Text style={[styles.legend, { color: colors.muted }]}>Blue: offers · Green: converted</Text></> : <Text style={[styles.note, { color: colors.muted }]}>No waitlist offers were recorded in this reporting range.</Text>}
  </View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 16 }, title: { fontSize: 18, fontWeight: "800" }, note: { fontSize: 12, lineHeight: 18 }, rangeRow: { flexDirection: "row", gap: 7 }, rangeButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 }, chart: { height: 145, flexDirection: "row", alignItems: "flex-end", gap: 7 }, column: { flex: 1, alignItems: "center", gap: 3 }, bars: { height: 92, width: "100%", flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 3 }, offered: { width: "38%", borderTopLeftRadius: 4, borderTopRightRadius: 4 }, converted: { width: "38%", borderTopLeftRadius: 4, borderTopRightRadius: 4 }, month: { fontSize: 10, fontWeight: "700" }, rate: { fontSize: 10, fontWeight: "800" }, legend: { fontSize: 11, fontWeight: "700" } });
