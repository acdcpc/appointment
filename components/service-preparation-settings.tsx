import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

export function ServicePreparationSettings() {
  const colors = useColors();
  const { services, preparationChecklists, updateServicePreparation } = usePediatricCare();
  const [service, setService] = useState(services[0]?.name ?? ""); const [itemsText, setItemsText] = useState(""); const [message, setMessage] = useState("");
  const checklist = preparationChecklists.find((item) => item.service === service);
  useEffect(() => { setItemsText(checklist?.items.join("\n") ?? ""); }, [checklist?.items, service]);
  const save = () => { const result = updateServicePreparation(service, itemsText.split("\n")); setMessage(result.ok ? "Preparation checklist saved for this service." : result.message); };
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.title, { color: colors.foreground }]}>Visit preparation checklists</Text><Text style={[styles.note, { color: colors.muted }]}>Clinician-managed, parent-visible logistical prompts. Use one short factual item per line; do not include diagnostic or treatment advice.</Text><View style={styles.chips}>{services.map((item) => <Pressable key={item.name} onPress={() => setService(item.name)} style={[styles.chip, { borderColor: service === item.name ? colors.primary : colors.border, backgroundColor: service === item.name ? "#E0F2F3" : colors.surface }]}><Text style={{ color: service === item.name ? colors.primary : colors.muted, fontWeight: "800", fontSize: 12 }}>{item.name}</Text></Pressable>)}</View><TextInput value={itemsText} onChangeText={setItemsText} multiline textAlignVertical="top" placeholder="One preparation item per line" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} /><Pressable onPress={save} style={[styles.save, { backgroundColor: colors.primary }]}><Text style={styles.saveText}>Save checklist</Text></Pressable>{message ? <Text style={[styles.message, { color: message.includes("saved") ? colors.success : colors.error }]}>{message}</Text> : null}</View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 22 }, title: { fontSize: 18, fontWeight: "800" }, note: { fontSize: 12, lineHeight: 18 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 }, input: { minHeight: 112, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 19 }, save: { borderRadius: 11, alignItems: "center", padding: 12 }, saveText: { color: "#FFFFFF", fontWeight: "800" }, message: { fontSize: 12, fontWeight: "800" } });
