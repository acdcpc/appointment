import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

export function ArchiveVolumeTrend({ data }: { data: { key: string; label: string; archivedRecords: number; archiveRuns: number }[] }) {
  const colors = useColors(); const maximum = Math.max(1, ...data.map((item) => item.archivedRecords));
  return <View style={[styles.card, { borderColor: colors.border }]}><View style={styles.heading}><Text style={[styles.title, { color: colors.foreground }]}>Archive volume · last 6 months</Text><Text style={[styles.legend, { color: colors.muted }]}>records archived</Text></View><View style={styles.chart}>{data.map((item) => <View key={item.key} style={styles.column}><Text style={[styles.value, { color: colors.foreground }]}>{item.archivedRecords}</Text><View style={styles.barSpace}><View style={[styles.bar, { height: Math.max(3, (item.archivedRecords / maximum) * 76), backgroundColor: item.archivedRecords ? colors.primary : colors.border }]} /></View><Text style={[styles.month, { color: colors.muted }]}>{item.label}</Text><Text style={[styles.runCount, { color: colors.muted }]}>{item.archiveRuns} run{item.archiveRuns === 1 ? "" : "s"}</Text></View>)}</View></View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 }, heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }, title: { fontSize: 13, fontWeight: "800" }, legend: { fontSize: 10 }, chart: { flexDirection: "row", justifyContent: "space-between", gap: 4, height: 124 }, column: { flex: 1, alignItems: "center", justifyContent: "flex-end" }, value: { fontSize: 10, fontWeight: "800" }, barSpace: { height: 80, justifyContent: "flex-end", alignItems: "center", width: "100%" }, bar: { width: "58%", minWidth: 7, borderRadius: 4 }, month: { fontSize: 10, marginTop: 3 }, runCount: { fontSize: 8, marginTop: 1 } });
