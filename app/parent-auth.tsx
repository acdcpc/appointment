import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLanguagePreference, bilingualText } from "@/lib/language-preference";

export default function ParentAuthMockup() {
  const colors = useColors();
  const router = useRouter();
  const { language } = useLanguagePreference();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "preview">("phone");
  const [message, setMessage] = useState("");
  const title = useMemo(() => bilingualText(language, "Parent sign in", "अभिभावक लग इन"), [language]);
  const requestCode = () => {
    if (!/^\+?[0-9\s-]{7,18}$/.test(phone.trim())) { setMessage(bilingualText(language, "Enter a valid phone number.", "मान्य फोन नम्बर लेख्नुहोस्।")); return; }
    setMessage(bilingualText(language, "Demo only: no SMS was sent. Enter any six digits to preview the next state.", "डेमो मात्र: कुनै SMS पठाइएको छैन। अर्को अवस्था हेर्न कुनै छ अंक लेख्नुहोस्।"));
    setStep("code");
  };
  const verifyCode = () => {
    if (!/^\d{6}$/.test(code)) { setMessage(bilingualText(language, "Enter six digits to preview the verified state.", "प्रमाणित अवस्था हेर्न छ अंक लेख्नुहोस्।")); return; }
    setMessage(bilingualText(language, "Preview state only. No account was authenticated.", "पूर्वावलोकन मात्र। कुनै खाता प्रमाणित गरिएको छैन।"));
    setStep("preview");
  };
  return <ScreenContainer className="p-5"><View style={styles.page}>
    <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={[styles.back, { color: colors.primary }]}>‹ {bilingualText(language, "Back", "पछाडि")}</Text></Pressable>
    <View style={[styles.brandMark, { backgroundColor: colors.primary }]}><Text style={styles.brandText}>R</Text></View>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>RAINBOW CHILD DEVELOPMENT CLINIC</Text>
    <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
    <Text style={[styles.subtitle, { color: colors.muted }]}>{bilingualText(language, "Use your phone number to continue. This screen is a design mockup and does not send an OTP.", "फोन नम्बरबाट अघि बढ्नुहोस्। यो डिजाइन डेमो हो र OTP पठाउँदैन।")}</Text>
    <View style={[styles.notice, { backgroundColor: "#FFF8EB", borderColor: colors.warning }]}><Text style={[styles.noticeTitle, { color: colors.warning }]}>{bilingualText(language, "Free preview only", "निःशुल्क पूर्वावलोकन मात्र")}</Text><Text style={[styles.noticeText, { color: colors.foreground }]}>{bilingualText(language, "No SMS provider, paid service, credential, or real authentication is connected.", "कुनै SMS सेवा, शुल्क लाग्ने सेवा, प्रमाणपत्र वा वास्तविक प्रमाणीकरण जोडिएको छैन।")}</Text></View>
    {step === "phone" ? <><Text style={[styles.label, { color: colors.muted }]}>{bilingualText(language, "Phone number", "फोन नम्बर")}</Text><TextInput value={phone} onChangeText={setPhone} placeholder="+977 98…" placeholderTextColor={colors.muted} keyboardType="phone-pad" autoCapitalize="none" style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} accessibilityLabel="Parent phone number" /><Pressable onPress={requestCode} style={[styles.button, { backgroundColor: "#F97360" }]}><Text style={styles.buttonText}>{bilingualText(language, "Request code", "कोड माग्नुहोस्")}</Text></Pressable></> : null}
    {step === "code" ? <><View style={styles.row}><Text style={[styles.label, { color: colors.muted }]}>{bilingualText(language, "Code sent to", "कोड पठाइएको नम्बर")}</Text><Pressable onPress={() => { setStep("phone"); setMessage(""); }}><Text style={[styles.edit, { color: colors.primary }]}>{bilingualText(language, "Edit", "सम्पादन")}</Text></Pressable></View><Text style={[styles.phone, { color: colors.foreground }]}>{phone}</Text><TextInput value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={6} style={[styles.input, styles.codeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} accessibilityLabel="Six digit one time code" /><Pressable onPress={verifyCode} style={[styles.button, { backgroundColor: "#F97360" }]}><Text style={styles.buttonText}>{bilingualText(language, "Verify code", "कोड प्रमाणित गर्नुहोस्")}</Text></Pressable><Pressable onPress={requestCode}><Text style={[styles.link, { color: colors.primary }]}>{bilingualText(language, "Resend code (preview)", "कोड फेरि पठाउनुहोस् (पूर्वावलोकन)")}</Text></Pressable></> : null}
    {step === "preview" ? <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.success }]}><Text style={[styles.previewTitle, { color: colors.success }]}>{bilingualText(language, "Preview complete", "पूर्वावलोकन पूरा भयो")}</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{bilingualText(language, "The real phone-plus-OTP provider, rate limits, recovery, and account linking still need separate approval.", "वास्तविक फोन-OTP सेवा, सीमाहरू, पुनःप्राप्ति र खाता जोड्ने कामका लागि छुट्टै स्वीकृति आवश्यक छ।")}</Text><Pressable onPress={() => { setStep("phone"); setCode(""); setMessage(""); }}><Text style={[styles.link, { color: colors.primary }]}>{bilingualText(language, "Preview again", "फेरि पूर्वावलोकन")}</Text></Pressable></View> : null}
    {message ? <Text style={[styles.message, { color: message.includes("No SMS") || message.includes("SMS") || message.includes("Demo") || message.includes("डेमो") ? colors.warning : colors.muted }]}>{message}</Text> : null}
  </View></ScreenContainer>;
}

const styles = StyleSheet.create({ page: { maxWidth: 520, width: "100%", alignSelf: "center", paddingTop: 8 }, back: { fontSize: 15, fontWeight: "800", marginBottom: 28 }, brandMark: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 }, brandText: { color: "#FFFFFF", fontSize: 28, fontWeight: "900" }, eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 1, marginBottom: 10 }, title: { fontSize: 32, fontWeight: "900", lineHeight: 40 }, subtitle: { fontSize: 16, lineHeight: 24, marginTop: 10 }, notice: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 22 }, noticeTitle: { fontSize: 13, fontWeight: "900" }, noticeText: { fontSize: 13, lineHeight: 19, marginTop: 4 }, label: { fontSize: 13, fontWeight: "800", marginTop: 26, marginBottom: 8 }, input: { borderWidth: 1, borderRadius: 14, minHeight: 50, paddingHorizontal: 14, fontSize: 17 }, codeInput: { letterSpacing: 8, textAlign: "center", fontWeight: "900" }, button: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 16 }, buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26 }, rowLabel: { marginTop: 0 }, edit: { fontSize: 13, fontWeight: "900" }, phone: { fontSize: 16, fontWeight: "800", marginTop: -2 }, link: { textAlign: "center", marginTop: 18, fontSize: 14, fontWeight: "900" }, preview: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 26 }, previewTitle: { fontSize: 17, fontWeight: "900" }, message: { textAlign: "center", fontSize: 13, fontWeight: "800", lineHeight: 19, marginTop: 18 } });
