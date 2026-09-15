import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ReportAcknowledgementScreen() {
  const colors = useColors();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const status = trpc.reportAcknowledgement.status.useQuery({ token: token ?? "" }, { enabled: Boolean(token) });
  const confirm = trpc.reportAcknowledgement.confirm.useMutation();
  const [acknowledgementText, setAcknowledgementText] = useState("I confirm that I received this report.");
  const [message, setMessage] = useState("");
  const submit = async () => { if (!token) return; try { const result = await confirm.mutateAsync({ token, acknowledgementText }); setMessage(result.acknowledged ? "Receipt confirmed. Thank you." : "This report receipt has already been confirmed." ); await status.refetch(); } catch { setMessage("This acknowledgement could not be recorded. Please contact the clinic."); } };
  const title = status.data?.scope === "timeline-report" ? "Report receipt acknowledgement" : "Medical record receipt acknowledgement";
  return <ScreenContainer className="p-5"><View style={s.wrap}>{status.isLoading ? <ActivityIndicator color={colors.primary} /> : !token ? <Text style={[s.text, { color: colors.error }]}>This acknowledgement link is unavailable. Please contact the clinic.</Text> : status.error ? <View style={{ gap: 10 }}><Text style={[s.text, { color: colors.muted }]}>We could not reach the clinic server. Check your internet connection and try again.</Text><Pressable onPress={() => status.refetch()} style={[s.button, { backgroundColor: colors.primary }]} accessibilityRole="button"><Text style={s.buttonText}>Try again</Text></Pressable></View> : <View style={[s.card, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[s.eyebrow, { color: colors.primary }]}>RAINBOW CHILD DEVELOPMENT CLINIC</Text><Text style={[s.title, { color: colors.foreground }]}>{title}</Text><Text style={[s.text, { color: colors.muted }]}>Please confirm that you received the report. This records receipt only; it does not confirm that you read, understood, or agreed with the report.</Text>{status.data?.acknowledgedAt ? <Text style={[s.confirmed, { color: colors.success }]}>Receipt confirmed on {new Date(status.data.acknowledgedAt).toLocaleString()}.</Text> : <><TextInput value={acknowledgementText} onChangeText={setAcknowledgementText} multiline style={[s.input, { color: colors.foreground, borderColor: colors.border }]} /><Pressable onPress={submit} disabled={confirm.isPending} style={[s.button, { backgroundColor: colors.primary, opacity: confirm.isPending ? 0.7 : 1 }]}>{confirm.isPending ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.buttonText}>Confirm receipt</Text>}</Pressable></>}{message ? <Text style={[s.feedback, { color: message.includes("confirmed") ? colors.success : colors.error }]}>{message}</Text> : null}</View>}</View></ScreenContainer>;
}

const s = StyleSheet.create({ wrap: { flex: 1, justifyContent: "center" }, card: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 14 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }, title: { fontSize: 24, lineHeight: 30, fontWeight: "800" }, text: { fontSize: 14, lineHeight: 21 }, input: { minHeight: 82, borderWidth: 1, borderRadius: 12, padding: 12, textAlignVertical: "top" }, button: { borderRadius: 13, padding: 14, alignItems: "center" }, buttonText: { fontWeight: "800" }, confirmed: { fontSize: 14, fontWeight: "800", lineHeight: 20 }, feedback: { fontSize: 13, fontWeight: "700", lineHeight: 19 } });
