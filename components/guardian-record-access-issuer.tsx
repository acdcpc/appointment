import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { trpc } from "@/lib/trpc";

/** Creates an in-person/manual sharing reference only; this component never sends a code. */
export function GuardianRecordAccessIssuer() {
  const colors = useColors();
  const { children } = usePediatricCare();
  const [childId, setChildId] = useState(children[0]?.id ?? "");
  const [issued, setIssued] = useState<{ reference: string; verificationCode: string; expiresAt: string; attemptLimit: number } | null>(null);
  const [message, setMessage] = useState("");
  const issue = trpc.clinician.issueGuardianRecordAccess.useMutation({ onSuccess: (result) => { setIssued(result); setMessage("One-time record-access reference prepared. Verify the guardian independently before sharing either value."); }, onError: () => setMessage("The record-access reference could not be prepared. Try again after reviewing the guardian record.") });

  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.title, { color: colors.foreground }]}>Guardian record-access reference</Text>
    <Text style={[styles.note, { color: colors.muted }]}>Prepare a one-time reference only after independent guardian verification. The app does not send it by email, SMS, WhatsApp, or any other channel.</Text>
    <View style={styles.options}>{children.map((child) => <Pressable key={child.id} accessibilityRole="button" accessibilityLabel={`Prepare guardian access for ${child.name}`} onPress={() => { setChildId(child.id); setIssued(null); }} style={[styles.option, { borderColor: childId === child.id ? colors.primary : colors.border, backgroundColor: childId === child.id ? "#E0F2F3" : colors.surface }]}><Text style={{ color: childId === child.id ? colors.primary : colors.muted, fontWeight: "800" }}>{child.name}</Text></Pressable>)}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="Prepare one-time guardian record access reference" onPress={() => issue.mutate({ childId })} disabled={issue.isPending} style={[styles.button, { backgroundColor: colors.primary, opacity: issue.isPending ? 0.7 : 1 }]}><Text style={styles.buttonText}>{issue.isPending ? "Preparing…" : "Prepare one-time access"}</Text></Pressable>
    {issued ? <View style={[styles.reference, { borderColor: colors.warning, backgroundColor: "#FFF9E8" }]}><Text style={[styles.referenceLabel, { color: colors.foreground }]}>Share manually only after guardian verification</Text><Text style={[styles.referenceValue, { color: colors.foreground }]}>Reference: {issued.reference}</Text><Text style={[styles.referenceValue, { color: colors.foreground }]}>One-time code: {issued.verificationCode}</Text><Text style={[styles.note, { color: colors.muted }]}>Expires {new Date(issued.expiresAt).toLocaleString()} · {issued.attemptLimit} failed attempts revoke it · it becomes unusable after a successful verification.</Text></View> : null}
    {message ? <Text style={[styles.message, { color: message.includes("prepared") ? colors.success : colors.error }]}>{message}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10, marginTop: 10 }, title: { fontSize: 16, fontWeight: "800" }, note: { fontSize: 13, lineHeight: 19 }, options: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, option: { minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 9, justifyContent: "center" }, button: { minHeight: 50, borderRadius: 14, padding: 14, alignItems: "center", justifyContent: "center" }, buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 }, reference: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 5 }, referenceLabel: { fontSize: 12, fontWeight: "800" }, referenceValue: { fontSize: 17, fontWeight: "800", letterSpacing: 0.5 }, message: { fontSize: 13, fontWeight: "800", lineHeight: 19 } });
