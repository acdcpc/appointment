import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLanguagePreference, bilingualText } from "@/lib/language-preference";
import { isSupabaseConfigured } from "@/lib/supabase";
import { requestGuardianOtp, signOutGuardian, verifyGuardianOtp } from "@/lib/supabase-auth";

export default function ParentAuth() {
  const colors = useColors();
  const router = useRouter();
  const { language } = useLanguagePreference();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "signed-in">("phone");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "error" | "success">("info");
  const [sessionPhone, setSessionPhone] = useState("");

  const title = useMemo(() => bilingualText(language, "Parent sign in", "अभिभावक लग इन"), [language]);
  const t = {
    notConfigured: bilingualText(language, "Sign-in is not available on this build because Supabase is not configured.", "यस बिल्डमा Supabase कन्फिगर नभएकाले लग इन उपलब्ध छैन।"),
    invalidPhone: bilingualText(language, "Enter a valid phone number with country code (e.g. +977 98XXXXXXXX).", "देशको कोडसहित मान्य फोन नम्बर लेख्नुहोस् (जस्तै +977 98XXXXXXXX)।"),
    requesting: bilingualText(language, "Requesting your one-time SMS code…", "तपाईंको एक पटकको SMS कोड माग्दै…"),
    codeSent: bilingualText(language, "A verification code was sent by SMS. Enter the six digits below.", "SMS मार्फत प्रमाणीकरण कोड पठाइयो। तल छ अंक लेख्नुहोस्।"),
    verifying: bilingualText(language, "Verifying your code…", "कोड प्रमाणित गर्दै…"),
    invalidCode: bilingualText(language, "Enter the six-digit code.", "छ अंकको कोड लेख्नुहोस्।"),
    signedIn: bilingualText(language, "You are signed in as a parent guardian.", "तपाईं अभिभावकको रूपमा लग इन हुनुभयो।"),
    backToPhone: bilingualText(language, "Use a different phone", "अर्को फोन प्रयोग गर्नुहोस्"),
    signOut: bilingualText(language, "Sign out", "लग आउट"),
  };

  const show = (text: string, kind: "info" | "error" | "success") => {
    setMessage(text);
    setMessageKind(kind);
  };

  const requestCode = async () => {
    if (!isSupabaseConfigured) { show(t.notConfigured, "error"); return; }
    if (!/^\+?[1-9][0-9\s-]{6,17}$/.test(phone.trim())) { show(t.invalidPhone, "error"); return; }
    setBusy(true);
    show(t.requesting, "info");
    try {
      await requestGuardianOtp(phone);
      show(t.codeSent, "success");
      setStep("code");
    } catch (error) {
      show(error instanceof Error ? error.message : t.notConfigured, "error");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) { show(t.invalidCode, "error"); return; }
    setBusy(true);
    show(t.verifying, "info");
    try {
      const session = await verifyGuardianOtp(phone, code);
      setSessionPhone(session.phone);
      setStep("signed-in");
      show(t.signedIn, "success");
    } catch (error) {
      show(error instanceof Error ? error.message : t.notConfigured, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOutGuardian();
    setStep("phone");
    setCode("");
    setPhone("");
    setSessionPhone("");
    show("", "info");
  };

  return (
    <ScreenContainer className="p-5">
      <View style={styles.page}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={[styles.back, { color: colors.primary }]}>‹ {bilingualText(language, "Back", "पछाडि")}</Text>
        </Pressable>
        <View style={[styles.brandMark, { backgroundColor: colors.primary }]}><Text style={styles.brandText}>R</Text></View>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>RAINBOW CHILD DEVELOPMENT CLINIC</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {bilingualText(language, "Use your phone number to continue. A one-time SMS code is sent to verify you — no account details are stored on this device by the clinic app.", "अघि बढ्न फोन नम्बर प्रयोग गर्नुहोस्। प्रमाणीकरणका लागि एक पटकको SMS कोड पठाइन्छ।")}
        </Text>

        {!isSupabaseConfigured ? (
          <View style={[styles.notice, { backgroundColor: "#FDECEC", borderColor: colors.warning }]}>
            <Text style={[styles.noticeTitle, { color: colors.warning }]}>{t.notConfigured}</Text>
          </View>
        ) : null}

        {step === "phone" ? (
          <>
            <Text style={[styles.label, { color: colors.muted }]}>{bilingualText(language, "Phone number", "फोन नम्बर")}</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+977 98XXXXXXXX"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              autoCapitalize="none"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              accessibilityLabel="Parent phone number"
            />
            <Pressable onPress={requestCode} disabled={busy} style={[styles.button, { backgroundColor: "#F97360" }]}>
              <Text style={styles.buttonText}>{busy ? t.requesting : bilingualText(language, "Request code", "कोड माग्नुहोस्")}</Text>
            </Pressable>
          </>
        ) : null}

        {step === "code" ? (
          <>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.muted }]}>{bilingualText(language, "Code sent to", "कोड पठाइएको नम्बर")}</Text>
              <Pressable onPress={() => { setStep("phone"); setMessage(""); }} disabled={busy}>
                <Text style={[styles.edit, { color: colors.primary }]}>{bilingualText(language, "Edit", "सम्पादन")}</Text>
              </Pressable>
            </View>
            <Text style={[styles.phone, { color: colors.foreground }]}>{phone}</Text>
            <TextInput
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, styles.codeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              accessibilityLabel="Six digit one time code"
            />
            <Pressable onPress={verifyCode} disabled={busy} style={[styles.button, { backgroundColor: "#F97360" }]}>
              <Text style={styles.buttonText}>{busy ? t.verifying : bilingualText(language, "Verify code", "कोड प्रमाणित गर्नुहोस्")}</Text>
            </Pressable>
            <Pressable onPress={requestCode} disabled={busy}>
              <Text style={[styles.link, { color: colors.primary }]}>{bilingualText(language, "Resend code", "कोड फेरि पठाउनुहोस्")}</Text>
            </Pressable>
          </>
        ) : null}

        {step === "signed-in" ? (
          <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.success }]}>
            <Text style={[styles.previewTitle, { color: colors.success }]}>{t.signedIn}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {bilingualText(language, "Phone", "फोन")}: {sessionPhone}
            </Text>
            <Pressable onPress={handleSignOut}>
              <Text style={[styles.link, { color: colors.primary }]}>{t.signOut}</Text>
            </Pressable>
            <Pressable onPress={() => { setStep("phone"); setCode(""); setMessage(""); }}>
              <Text style={[styles.link, { color: colors.primary }]}>{t.backToPhone}</Text>
            </Pressable>
          </View>
        ) : null}

        {message ? <Text style={[styles.message, { color: messageKind === "error" ? colors.warning : messageKind === "success" ? colors.success : colors.muted }]}>{message}</Text> : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { maxWidth: 520, width: "100%", alignSelf: "center", paddingTop: 8 },
  back: { fontSize: 15, fontWeight: "800", marginBottom: 28 },
  brandMark: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  brandText: { color: "#FFFFFF", fontSize: 28, fontWeight: "900" },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 1, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: "900", lineHeight: 40 },
  subtitle: { fontSize: 16, lineHeight: 24, marginTop: 10 },
  notice: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 22 },
  noticeTitle: { fontSize: 13, fontWeight: "900" },
  label: { fontSize: 13, fontWeight: "800", marginTop: 26, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 14, minHeight: 50, paddingHorizontal: 14, fontSize: 17 },
  codeInput: { letterSpacing: 8, textAlign: "center", fontWeight: "900" },
  button: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 16 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26 },
  edit: { fontSize: 13, fontWeight: "900" },
  phone: { fontSize: 16, fontWeight: "800", marginTop: -2 },
  link: { textAlign: "center", marginTop: 18, fontSize: 14, fontWeight: "900" },
  preview: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 26 },
  previewTitle: { fontSize: 17, fontWeight: "900" },
  message: { textAlign: "center", fontSize: 13, fontWeight: "800", lineHeight: 19, marginTop: 18 },
});
