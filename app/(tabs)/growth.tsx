import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { GrowthMeasurementEntry } from "@/components/growth-measurement-entry";
import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { useLanguagePreference } from "@/lib/language-preference";
import { isAuthorityRole, useAuthorityRole } from "@/lib/authority-role";

/**
 * Growth tab.
 *
 * Growth values are recorded in one place. The clinic can add a measurement
 * here; a signed-in guardian sees the measurements the clinic has recorded for
 * their child, without an editing form.
 */
export default function GrowthTab() {
  const colors = useColors();
  const { language } = useLanguagePreference();
  const { activeChild, growthMetrics, childrenSource } = usePediatricCare();
  const role = useAuthorityRole();
  const canRecord = isAuthorityRole(role);
  const measurements = growthMetrics
    .filter((item) => item.childId === activeChild.id)
    .sort((left, right) => Date.parse(right.occurredOn) - Date.parse(left.occurredOn));

  return (
    <ScreenContainer className="p-5" maxWidth={980}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>RAINBOW CHILD DEVELOPMENT CLINIC</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {language === "ne" ? "वृद्धि मापन" : "Growth measurements"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {language === "ne"
            ? "तौल, उचाइ र शिरको परिधिको मापन — यही ठाउँमा।"
            : "Weight, height and head circumference — recorded and kept in one place."}
        </Text>

        {canRecord ? <GrowthMeasurementEntry /> : null}

        <Text style={[styles.section, { color: colors.foreground }]}>
          {language === "ne" ? "मापनहरू" : "Recorded measurements"}
        </Text>
        {measurements.length ? measurements.map((item) => (
          <View key={item.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 14 }}>{item.occurredOn}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {[
                  item.weightKg !== undefined ? `Weight ${item.weightKg} kg` : null,
                  item.heightCm !== undefined ? `Height ${item.heightCm} cm` : null,
                  item.headCircumferenceCm !== undefined ? `Head ${item.headCircumferenceCm} cm` : null,
                ].filter(Boolean).join(" · ") || "No values recorded"}
              </Text>
              {item.note ? <Text style={{ color: colors.muted, fontSize: 12 }}>{item.note}</Text> : null}
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
              {item.ageMonths} mo · {item.recordedRole === "guardian" ? "Parent" : "Clinic"}
            </Text>
          </View>
        )) : (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.foreground, fontWeight: "800" }}>
              {childrenSource === "server"
                ? (language === "ne" ? "अझै कुनै मापन रेकर्ड भएको छैन।" : "No measurements recorded yet.")
                : (language === "ne" ? "मापन हेर्न क्लिनिकसँग जोडिएको खाताले लग इन गर्नुहोस्।" : "Sign in with the account the clinic has linked to see measurements.")}
            </Text>
          </View>
        )}
        <Text style={[styles.note, { color: colors.muted }]}>
          {language === "ne"
            ? "यी मापन क्लिनिकको रेकर्ड हुन्; व्याख्या डा. ओझाले गर्नुहुन्छ।"
            : "These are the clinic's recorded values. Interpretation is by Dr. Ojha."}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, letterSpacing: 1.4, fontWeight: "800", marginTop: 6 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "800", marginTop: 5 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  section: { fontSize: 13, fontWeight: "800", letterSpacing: 0.8, marginTop: 24, marginBottom: 8 },
  row: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 9, flexWrap: "wrap" },
  empty: { borderWidth: 1, borderRadius: 16, padding: 16 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 12, marginBottom: 8 },
});
