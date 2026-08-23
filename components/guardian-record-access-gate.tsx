import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function GuardianRecordAccessGate({ onVerified }: { onVerified: (grant: { childId: string; accessExpiresAt: string }) => void }) {
  const colors = useColors();
  const [reference, setReference] = useState(""); const [verificationCode, setVerificationCode] = useState(""); const [message, setMessage] = useState("");
  const verify = trpc.guardianRecordAccess.verify.useMutation({ onSuccess: (grant) => { setMessage(""); onVerified(grant); }, onError: () => setMessage("The reference or one-time code could not be verified. It may be expired, used, unavailable, or locked after failed attempts.") });
  const submit = () => { const normalizedReference = reference.trim().toUpperCase(); const normalizedCode = verificationCode.trim(); if (!/^[A-F0-9]{12}$/.test(normalizedReference) || !/^\d{6}$/.test(normalizedCode)) { setMessage("Enter the 12-character reference and 6-digit one-time code supplied by the clinic."); return; } verify.mutate({ reference: normalizedReference, verificationCode: normalizedCode }); };
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.title, { color: colors.foreground }]}>Verify guardian access</Text>
    <Text style={[styles.body, { color: colors.muted }]}>To protect child records, enter the one-time reference and code provided by the clinic after the guardian has been independently verified. This check does not confirm identity by itself and it does not send messages automatically.</Text>
    <Text style={[styles.label, { color: colors.foreground }]}>Record-access reference</Text><TextInput value={reference} onChangeText={(value) => setReference(value.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 12))} autoCapitalize="characters" autoCorrect={false} placeholder="12-character reference" placeholderTextColor={colors.muted} accessibilityLabel="12 character record access reference" style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
    <Text style={[styles.label, { color: colors.foreground }]}>One-time code</Text><TextInput value={verificationCode} onChangeText={(value) => setVerificationCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" placeholder="6-digit code" placeholderTextColor={colors.muted} accessibilityLabel="6 digit one time code" style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
    {message ? <Text style={[styles.message, { color: colors.error }]}>{message}</Text> : null}<Pressable accessibilityRole="button" accessibilityLabel="Verify guardian access to child records" onPress={submit} disabled={verify.isPending} style={[styles.button, { backgroundColor: colors.primary, opacity: verify.isPending ? 0.7 : 1 }]}>{verify.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify and open records</Text>}</Pressable>
  </View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 9, marginTop: 16 }, title: { fontSize: 20, fontWeight: "800" }, body: { fontSize: 14, lineHeight: 21 }, label: { fontSize: 13, fontWeight: "800", marginTop: 5 }, input: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, fontSize: 16, letterSpacing: 1.2 }, message: { fontSize: 13, fontWeight: "800", lineHeight: 19 }, button: { minHeight: 52, borderRadius: 14, padding: 14, alignItems: "center", justifyContent: "center", marginTop: 3 }, buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" } });
