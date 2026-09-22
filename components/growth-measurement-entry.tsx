import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { todayClinicDate } from "@/lib/growth-measurements";

/**
 * Growth measurement entry — weight, height and head circumference.
 *
 * The dashboard displayed growth values but had nowhere to record them: the
 * measurements were a fixed demo list. This is the missing input, matching the
 * Kapoori Ka flow (pick the child, date the measurement, enter the values,
 * save, and see it appear in the child’s growth history immediately).
 */
export function GrowthMeasurementEntry() {
  const colors = useColors();
  const { children, activeChild, setActiveChild, growthMetrics, recordGrowthMeasurement } = usePediatricCare();
  const [childId, setChildId] = useState(activeChild.id);
  const [measuredOn, setMeasuredOn] = useState(todayClinicDate());
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const selectedChild = children.find((child) => child.id === childId) ?? activeChild;
  const childMeasurements = growthMetrics
    .filter((item) => item.childId === childId)
    .slice(0, 4);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const result = await recordGrowthMeasurement({ childId, measuredOn, weightKg, heightCm, headCircumferenceCm, note });
    setMessage({ ok: result.ok, text: result.message });
    if (result.ok) {
      // Show the patient just measured: the chart, the interpretation and the
      // visit-to-visit comparison below all follow the active child.
      if (childId !== activeChild.id) setActiveChild(childId);
      setWeightKg("");
      setHeightCm("");
      setHeadCircumferenceCm("");
      setNote("");
    }
    setSaving(false);
  };

  const field = (
    label: string,
    value: string,
    onChangeText: (next: string) => void,
    placeholder: string,
    accessibilityLabel: string,
  ) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        inputMode="decimal"
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.foreground }]}>Add a growth measurement</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Record weight, height and head circumference for {selectedChild.name}. Values appear in the child’s growth history and WHO reference charts straight away.
      </Text>

      <Text style={[styles.label, { color: colors.muted }]}>Child</Text>
      <View style={styles.chipRow}>
        {children.map((child) => {
          const selected = child.id === childId;
          return (
            <Pressable
              key={child.id}
              onPress={() => setChildId(child.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.tealSurface : colors.surface }]}
            >
              <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: "800", fontSize: 13 }}>{child.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1.4 }]}>
          <Text style={[styles.label, { color: colors.muted }]}>Measurement date</Text>
          <TextInput
            value={measuredOn}
            onChangeText={setMeasuredOn}
            placeholder="20 Sep 2026"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            accessibilityLabel="Measurement date"
          />
        </View>
        <Pressable
          onPress={() => setMeasuredOn(todayClinicDate())}
          accessibilityRole="button"
          style={[styles.todayButton, { borderColor: colors.primary }]}
        >
          <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 13 }}>Today</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        {field("Weight (kg)", weightKg, setWeightKg, "15.2", "Weight in kilograms")}
        {field("Height (cm)", heightCm, setHeightCm, "99.4", "Height in centimetres")}
        {field("Head circumference (cm)", headCircumferenceCm, setHeadCircumferenceCm, "48.5", "Head circumference in centimetres")}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.muted }]}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Seen at follow-up visit"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
          accessibilityLabel="Measurement note"
        />
      </View>

      <Pressable
        onPress={save}
        disabled={saving}
        accessibilityRole="button"
        style={[styles.saveButton, { backgroundColor: colors.action, opacity: saving ? 0.7 : 1 }]}
      >
        {saving ? (
          <ActivityIndicator color={colors.onAction} />
        ) : (
          <Text style={[styles.saveText, { color: colors.onAction }]}>Save measurement / मापन सुरक्षित गर्नुहोस्</Text>
        )}
      </Pressable>

      {message ? (
        <View style={[styles.banner, { backgroundColor: message.ok ? colors.successSurface : colors.dangerSurface, borderColor: message.ok ? colors.success : colors.error }]}>
          <Text style={{ color: message.ok ? colors.success : colors.error, fontWeight: "800", fontSize: 13 }}>{message.text}</Text>
        </View>
      ) : null}

      <Text style={[styles.label, { color: colors.muted }]}>{selectedChild.name}’s recent measurements</Text>
      {childMeasurements.length ? childMeasurements.map((item) => (
        <View key={item.id} style={[styles.measurementRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>{item.occurredOn}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {[
              item.weightKg !== undefined ? `${item.weightKg} kg` : null,
              item.heightCm !== undefined ? `${item.heightCm} cm` : null,
              item.headCircumferenceCm !== undefined ? `head ${item.headCircumferenceCm} cm` : null,
            ].filter(Boolean).join(" · ") || "No values recorded"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{item.ageMonths} months</Text>
        </View>
      )) : (
        <Text style={{ color: colors.muted, fontSize: 13 }}>No measurements recorded for this child yet.</Text>
      )}
      <Text style={[styles.disclaimer, { color: colors.muted }]}>
        Enter only values measured in the clinic or reported by the parent. Charts are reference context, not a diagnosis.
      </Text>
    </View>
  );
}


const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 24 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, marginTop: 6 },
  row: { flexDirection: "row", gap: 8, alignItems: "flex-end", flexWrap: "wrap" },
  field: { flex: 1, minWidth: 120, gap: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, minHeight: 44 },
  todayButton: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 44, alignItems: "center", justifyContent: "center" },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: "center" },
  saveButton: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  saveText: { fontSize: 15, fontWeight: "900" },
  banner: { borderWidth: 1, borderRadius: 13, padding: 12 },
  measurementRow: { borderWidth: 1, borderRadius: 13, padding: 12, gap: 3 },
  disclaimer: { fontSize: 11, lineHeight: 16, marginTop: 4 },
});
