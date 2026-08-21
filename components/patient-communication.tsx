import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { buildChildRecordHtml, buildChildTimelineHtml, composePatientEmail } from "@/lib/child-record-pdf";
import { type PatientCommunicationScope, usePediatricCare } from "@/lib/pediatric-care";
import { useColors } from "@/hooks/use-colors";

const scopeLabels: Record<PatientCommunicationScope, string> = { message: "Message only", "record-pdf": "Medical record PDF", "timeline-report": "Timeline report PDF" };

export function PatientCommunication() {
  const colors = useColors();
  const { activeChild, children, setActiveChild, history, prescriptions, growthMetrics, appointments, recordPatientCommunication } = usePediatricCare();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("Update from Rainbow Child Development Clinic");
  const [body, setBody] = useState("Dear parent or guardian,\n\nPlease find the requested update from Dr. Anil Ojha’s clinic.\n\nKind regards,\nRainbow Child Development Clinic");
  const [scope, setScope] = useState<PatientCommunicationScope>("message");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const childHistory = useMemo(() => history.filter((item) => item.childId === activeChild.id), [activeChild.id, history]);
  const childPrescriptions = useMemo(() => prescriptions.filter((item) => item.childId === activeChild.id), [activeChild.id, prescriptions]);
  const childGrowth = useMemo(() => growthMetrics.filter((item) => item.childId === activeChild.id), [activeChild.id, growthMetrics]);
  const childAppointments = useMemo(() => appointments.filter((item) => item.childId === activeChild.id), [activeChild.id, appointments]);
  const openDraft = async () => {
    if (!/^\S+@\S+\.\S+$/.test(recipientEmail.trim())) { setMessage("Enter a valid parent or guardian email before opening the draft."); return; }
    if (!subject.trim() || !body.trim()) { setMessage("Review and complete both the subject and message before opening the draft."); return; }
    setSending(true);
    const html = scope === "message" ? undefined : scope === "record-pdf" ? buildChildRecordHtml(activeChild, childHistory, childPrescriptions) : buildChildTimelineHtml(activeChild, childHistory, childPrescriptions, childGrowth, childAppointments);
    const result = await composePatientEmail(html, recipientEmail, subject, body);
    recordPatientCommunication(activeChild.id, activeChild.parentName, recipientEmail, scope, result.status);
    setMessage(result.message);
    setSending(false);
  };
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.title, { color: colors.foreground }]}>Send patient update or report</Text><Text style={[styles.note, { color: colors.muted }]}>Clinician only. Select one child, review the parent/guardian recipient and content, then open a device email draft. This panel never sends automatically.</Text><Text style={[styles.label, { color: colors.muted }]}>Patient</Text><View style={styles.choices}>{children.map((child) => <Pressable key={child.id} onPress={() => setActiveChild(child.id)} style={[styles.choice, { borderColor: activeChild.id === child.id ? colors.primary : colors.border, backgroundColor: activeChild.id === child.id ? "#E0F2F3" : "#FFFFFF" }]}><Text style={{ color: activeChild.id === child.id ? colors.primary : colors.foreground, fontWeight: "800", fontSize: 12 }}>{child.name}</Text></Pressable>)}</View><Text style={[styles.selected, { color: colors.foreground }]}>Selected: {activeChild.name} · Parent/guardian: {activeChild.parentName}</Text><TextInput value={recipientEmail} onChangeText={setRecipientEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Parent or guardian email" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} /><TextInput value={subject} onChangeText={setSubject} placeholder="Email subject" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} /><TextInput value={body} onChangeText={setBody} multiline placeholder="Clinician-reviewed message" placeholderTextColor={colors.muted} style={[styles.messageInput, { color: colors.foreground, borderColor: colors.border }]} /><Text style={[styles.label, { color: colors.muted }]}>Include</Text><View style={styles.choices}>{(Object.keys(scopeLabels) as PatientCommunicationScope[]).map((item) => <Pressable key={item} onPress={() => setScope(item)} style={[styles.choice, { borderColor: scope === item ? colors.primary : colors.border, backgroundColor: scope === item ? "#E0F2F3" : "#FFFFFF" }]}><Text style={{ color: scope === item ? colors.primary : colors.foreground, fontWeight: "800", fontSize: 12 }}>{scopeLabels[item]}</Text></Pressable>)}</View><Text style={[styles.privacy, { color: colors.muted }]}>{scope === "message" ? "No attachment will be generated." : "The attachment includes only this child’s parent-visible records. Internal notes and other patient data are excluded."}</Text><Pressable onPress={openDraft} disabled={sending} style={[styles.button, { backgroundColor: colors.primary, opacity: sending ? 0.7 : 1 }]}>{sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Review and open email draft</Text>}</Pressable>{message ? <Text style={[styles.feedback, { color: message.includes("opened") || message.includes("reported") ? colors.success : colors.error }]}>{message}</Text> : null}</View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 22 }, title: { fontSize: 18, fontWeight: "800" }, note: { fontSize: 13, lineHeight: 19 }, label: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginTop: 2 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, choice: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 8 }, selected: { fontSize: 12, fontWeight: "700" }, input: { borderWidth: 1, borderRadius: 11, padding: 11, fontSize: 13 }, messageInput: { minHeight: 100, borderWidth: 1, borderRadius: 11, padding: 11, fontSize: 13, textAlignVertical: "top" }, privacy: { fontSize: 12, lineHeight: 18 }, button: { borderRadius: 12, padding: 13, alignItems: "center" }, buttonText: { color: "#FFFFFF", fontWeight: "800" }, feedback: { fontSize: 12, fontWeight: "700", lineHeight: 18 } });
