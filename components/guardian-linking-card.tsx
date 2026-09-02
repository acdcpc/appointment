import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { bilingualText, useLanguagePreference } from "@/lib/language-preference";
import { trpc } from "@/lib/trpc";

/**
 * Clinic staff tool: connect a parent's app account (by email) to a child
 * record. Once linked and verified, the parent's Home/Records show the real
 * child (server-scoped via clinic_children RLS).
 */
export function GuardianLinkingCard() {
  const colors = useColors();
  const { language } = useLanguagePreference();
  const t = (english: string, nepali: string) => bilingualText(language, english, nepali);

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [childId, setChildId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newAllergies, setNewAllergies] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const childrenQuery = trpc.guardianLinking.listChildren.useQuery();
  const linksQuery = trpc.guardianLinking.listLinks.useQuery();
  const linkMutation = trpc.guardianLinking.link.useMutation({
    onSuccess: (result) => {
      setMessage({ ok: true, text: t(`Linked ${result.guardianEmail} to a child record.`, `${result.guardianEmail} बच्चाको रेकर्डसँग जोडियो।`) });
      setGuardianEmail(""); setChildId(""); setNewName(""); setNewDob(""); setNewAllergies(""); setFullName("");
      linksQuery.refetch(); childrenQuery.refetch();
    },
    onError: (error) => setMessage({ ok: false, text: error.message }),
  });
  const unlinkMutation = trpc.guardianLinking.unlink.useMutation({
    onSuccess: () => { linksQuery.refetch(); },
    onError: (error) => setMessage({ ok: false, text: error.message }),
  });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(guardianEmail.trim());
  const canSubmit = useMemo(() => {
    if (!emailValid) return false;
    if (mode === "existing") return Boolean(childId);
    return newName.trim().length >= 2;
  }, [emailValid, mode, childId, newName]);

  const submit = () => {
    setMessage(null);
    linkMutation.mutate({
      guardianEmail: guardianEmail.trim(),
      ...(mode === "existing" ? { childId } : { newChild: { name: newName.trim(), dateOfBirth: newDob.trim() || undefined, allergies: newAllergies.trim() || undefined } }),
      ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("Link guardian to child", "अभिभावकलाई बच्चासँग जोड्नुहोस्")}</Text>
      <Text style={[styles.hint, { color: colors.muted }]}>
        {t("Connect a parent's app account to their child's record. The parent must sign up in the app first.", "अभिभावकको खाता बच्चाको रेकर्डसँग जोड्नुहोस्। अभिभावकले पहिले एपमा खाता खोल्नुपर्छ।")}
      </Text>

      <Text style={[styles.label, { color: colors.muted }]}>{t("Parent account email", "अभिभावकको इमेल")}</Text>
      <TextInput
        value={guardianEmail}
        onChangeText={setGuardianEmail}
        placeholder="parent@example.com"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
        accessibilityLabel={t("Parent account email", "अभिभावकको इमेल")}
      />
      {!emailValid && guardianEmail.length > 0 ? (
        <Text style={{ color: colors.error, fontSize: 12 }}>{t("Enter a valid email address.", "मान्य इमेल ठेगाना लेख्नुहोस्।")}</Text>
      ) : null}

      <Text style={[styles.label, { color: colors.muted }]}>{t("Child record", "बच्चाको रेकर्ड")}</Text>
      <View style={styles.modeRow}>
        <Pressable onPress={() => setMode("existing")} style={[styles.modeChip, { borderColor: mode === "existing" ? colors.primary : colors.border, backgroundColor: mode === "existing" ? colors.tealSurface : colors.surface }]} accessibilityRole="button">
          <Text style={{ color: mode === "existing" ? colors.primary : colors.muted, fontWeight: "800", fontSize: 13 }}>{t("Existing child", "विद्यमान बच्चा")}</Text>
        </Pressable>
        <Pressable onPress={() => setMode("new")} style={[styles.modeChip, { borderColor: mode === "new" ? colors.primary : colors.border, backgroundColor: mode === "new" ? colors.tealSurface : colors.surface }]} accessibilityRole="button">
          <Text style={{ color: mode === "new" ? colors.primary : colors.muted, fontWeight: "800", fontSize: 13 }}>{t("New child", "नयाँ बच्चा")}</Text>
        </Pressable>
      </View>

      {mode === "existing" ? (
        childrenQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (childrenQuery.data?.length ?? 0) === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 13 }}>{t("No child records yet — create one with “New child”.", "कुनै बच्चा रेकर्ड छैन — “नयाँ बच्चा” बाट बनाउनुहोस्।")}</Text>
        ) : (
          <View style={styles.childPicker}>
            {childrenQuery.data?.map((child) => (
              <Pressable key={child.id} onPress={() => setChildId(child.id)} accessibilityRole="button" style={[styles.childChip, { borderColor: childId === child.id ? colors.primary : colors.border, backgroundColor: childId === child.id ? colors.tealSurface : colors.surface }]}>
                <Text style={{ color: childId === child.id ? colors.primary : colors.muted, fontWeight: "800", fontSize: 13 }}>{child.name}</Text>
              </Pressable>
            ))}
          </View>
        )
      ) : (
        <View style={{ gap: 10 }}>
          <TextInput value={newName} onChangeText={setNewName} placeholder={t("Child's full name", "बच्चाको पूरा नाम")} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel={t("Child's full name", "बच्चाको पूरा नाम")} />
          <TextInput value={newDob} onChangeText={setNewDob} placeholder={t("Date of birth (e.g. 14 May 2022)", "जन्म मिति (जस्तै 14 May 2022)")} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel={t("Date of birth", "जन्म मिति")} />
          <TextInput value={newAllergies} onChangeText={setNewAllergies} multiline placeholder={t("Allergy notes (optional)", "एलर्जी टिपोट (ऐच्छिक)")} placeholderTextColor={colors.muted} style={[styles.input, styles.inputMultiline, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel={t("Allergy notes", "एलर्जी टिपोट")} />
        </View>
      )}

      <TextInput value={fullName} onChangeText={setFullName} placeholder={t("Parent/guardian name (optional)", "अभिभावकको नाम (ऐच्छिक)")} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel={t("Parent or guardian name", "अभिभावकको नाम")} />

      <Pressable
        onPress={submit}
        disabled={!canSubmit || linkMutation.isPending}
        style={[styles.linkButton, { backgroundColor: colors.primary, opacity: !canSubmit || linkMutation.isPending ? 0.6 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={t("Link guardian to child", "अभिभावकलाई बच्चासँग जोड्नुहोस्")}
      >
        {linkMutation.isPending ? <ActivityIndicator color={colors.textInverse} /> : <Text style={{ color: colors.textInverse, fontWeight: "900", fontSize: 14 }}>{t("Link guardian", "अभिभावक जोड्नुहोस्")}</Text>}
      </Pressable>

      {message ? <Text style={{ color: message.ok ? colors.success : colors.error, fontWeight: "800", fontSize: 13 }}>{message.text}</Text> : null}

      <Text style={[styles.linksTitle, { color: colors.foreground }]}>{t("Current links", "जोडिएका लिंकहरू")}</Text>
      {linksQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : (linksQuery.data?.length ?? 0) === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 13 }}>{t("No guardian links yet.", "अझै कुनै लिंक छैन।")}</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {linksQuery.data?.map((link) => (
            <View key={link.linkId} style={[styles.linkRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>{link.email}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{link.childId} · {link.relationship || "Parent"}{link.verified ? " · verified" : " · unverified"}</Text>
              </View>
              <Pressable onPress={() => unlinkMutation.mutate({ linkId: link.linkId })} disabled={unlinkMutation.isPending} accessibilityRole="button" style={styles.unlinkButton}>
                <Text style={{ color: colors.error, fontWeight: "800", fontSize: 12 }}>{t("Remove", "हटाउनुहोस्")}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  hint: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: "800", marginTop: 4 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  inputMultiline: { minHeight: 64, textAlignVertical: "top", paddingVertical: 10 },
  modeRow: { flexDirection: "row", gap: 8 },
  modeChip: { minHeight: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, justifyContent: "center" },
  childPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  childChip: { minHeight: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, justifyContent: "center" },
  linkButton: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  linksTitle: { fontSize: 14, fontWeight: "900", marginTop: 8 },
  linkRow: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  unlinkButton: { minHeight: 40, paddingHorizontal: 10, justifyContent: "center" },
});
