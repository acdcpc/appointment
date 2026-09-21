import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";

export type PatientContact = {
  childName: string;
  childAge?: string;
  childSex?: "male" | "female";
  weightKg?: number;
  heightCm?: number;
  phone?: string;
  email?: string;
  /** e.g. "Mon, Sep 21 · 6:00 PM · Pediatric consultation" */
  visitLabel?: string;
};

/**
 * Patient information, opened by tapping a patient's name.
 *
 * Shared by the booked-visits list and the clinic day focus, so the same
 * identification and the same messaging actions appear wherever a patient is
 * named — including the visit rows that previously had a name but no tap.
 */
export function PatientContactPanel({ contact, onContacted }: { contact: PatientContact; onContacted?: (message: string) => void }) {
  const colors = useColors();
  const { children } = usePediatricCare();
  const linked = children.find((child) => child.name.trim().toLowerCase() === contact.childName.trim().toLowerCase());
  const [outgoing, setOutgoing] = useState(
    `Namaste, this is Rainbow Child Development Clinic. Regarding ${contact.childName}${contact.visitLabel ? `'s visit (${contact.visitLabel})` : ""} — `,
  );
  const [notice, setNotice] = useState("");

  const digits = (contact.phone ?? "").replace(/\D/g, "");
  const waNumber = digits ? (digits.startsWith("977") ? digits : `977${digits}`) : "";

  const sendWhatsApp = async () => {
    if (!waNumber) { setNotice("No contact number is recorded for this family yet, so WhatsApp cannot be opened. The number is captured when the parent books."); return; }
    try {
      await Linking.openURL(`https://wa.me/${waNumber}?text=${encodeURIComponent(outgoing)}`);
      setNotice("WhatsApp opened with your message.");
      onContacted?.("WhatsApp opened with your message.");
    } catch {
      setNotice("WhatsApp could not be opened. Use Call, or copy the message.");
    }
  };

  const sendEmail = async () => {
    if (!contact.email) { setNotice("No email address was given for this family. Ask for one at the visit, or send on WhatsApp."); return; }
    const url = `mailto:${contact.email}?subject=${encodeURIComponent("Your child’s visit at Rainbow Child Development Clinic")}&body=${encodeURIComponent(outgoing)}`;
    try { await Linking.openURL(url); setNotice("Email app opened with your message."); }
    catch { setNotice("No email app is available. Copy the message instead."); }
  };

  const copyMessage = async () => {
    try { await Clipboard.setStringAsync(outgoing); setNotice("Message copied."); }
    catch { setNotice("Copy was unavailable."); }
  };

  const detail = [
    contact.childAge,
    contact.childSex ? (contact.childSex === "male" ? "Boy" : "Girl") : undefined,
    contact.weightKg !== undefined ? `${contact.weightKg} kg` : undefined,
    contact.heightCm !== undefined ? `${contact.heightCm} cm` : undefined,
  ].filter(Boolean).join(" · ");

  return (
    <View style={[styles.wrap, { borderTopColor: colors.border }]}>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>PATIENT IDENTIFICATION</Text>
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "900" }}>{contact.childName}</Text>
      {detail ? <Text style={{ color: colors.muted, fontSize: 13 }}>{detail}</Text> : null}
      {linked ? (
        <Text style={{ color: colors.success, fontSize: 12, fontWeight: "800" }}>
          Linked patient record: date of birth {linked.dateOfBirth}{linked.allergies ? ` · ${linked.allergies}` : ""}
        </Text>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          No patient record is linked to this name yet — the clinic creates it when the visit is confirmed.
        </Text>
      )}
      {contact.visitLabel ? <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>{contact.visitLabel}</Text> : null}
      <Text style={{ color: colors.foreground, fontSize: 13 }}>
        Contact: {contact.phone || "no number recorded"}{contact.email ? ` · ${contact.email}` : " · no email given"}
      </Text>

      <View style={styles.actions}>
        <Pressable onPress={() => contact.phone && Linking.openURL(`tel:${contact.phone}`).catch(() => undefined)} accessibilityRole="button" style={[styles.action, { borderColor: contact.phone ? colors.primary : colors.border, opacity: contact.phone ? 1 : 0.6 }]}>
          <Text style={{ color: contact.phone ? colors.primary : colors.muted, fontWeight: "800", fontSize: 12 }}>Call {contact.phone || "—"}</Text>
        </Pressable>
        <Pressable onPress={sendWhatsApp} accessibilityRole="button" style={[styles.action, { borderColor: colors.success }]}>
          <Text style={{ color: colors.success, fontWeight: "800", fontSize: 12 }}>WhatsApp this parent</Text>
        </Pressable>
        <Pressable onPress={sendEmail} accessibilityRole="button" style={[styles.action, { borderColor: contact.email ? colors.primary : colors.border, opacity: contact.email ? 1 : 0.6 }]}>
          <Text style={{ color: contact.email ? colors.primary : colors.muted, fontWeight: "800", fontSize: 12 }}>Email this parent</Text>
        </Pressable>
      </View>

      <Text style={[styles.eyebrow, { color: colors.muted, marginTop: 6 }]}>Message to this family</Text>
      <TextInput
        value={outgoing}
        onChangeText={setOutgoing}
        multiline
        placeholder="Type the message you want to send about this visit"
        placeholderTextColor={colors.muted}
        style={[styles.messageInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
        accessibilityLabel="Message to this family"
      />
      <View style={styles.actions}>
        <Pressable onPress={sendWhatsApp} accessibilityRole="button" style={[styles.action, { backgroundColor: colors.action, borderColor: colors.action }]}>
          <Text style={{ color: colors.onAction, fontWeight: "900", fontSize: 12 }}>Send on WhatsApp</Text>
        </Pressable>
        <Pressable onPress={copyMessage} accessibilityRole="button" style={[styles.action, { borderColor: colors.border }]}>
          <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}>Copy message</Text>
        </Pressable>
      </View>
      {notice ? <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>{notice}</Text> : null}
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
        Messages are sent from the clinic’s own phone or email account. Nothing is sent automatically.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, paddingTop: 12, gap: 6 },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  action: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, minHeight: 40, justifyContent: "center" },
  messageInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 84, fontSize: 14 },
});
