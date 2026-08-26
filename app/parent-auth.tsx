import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLanguagePreference, bilingualText } from "@/lib/language-preference";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  getGuardianSession,
  signInGuardianWithEmail,
  signOutGuardian,
  signUpGuardianWithEmail,
} from "@/lib/supabase-auth";

/**
 * Parent (guardian) account screen — production path is Supabase Auth with
 * EMAIL + PASSWORD (no SMS provider anywhere). Phone OTP can be added later
 * behind the same lib/supabase-auth.ts seam without touching this screen.
 */
export default function ParentAuth() {
  const colors = useColors();
  const router = useRouter();
  const { language } = useLanguagePreference();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "error" | "success">("info");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const title = useMemo(() => bilingualText(language, "Parent sign in", "अभिभावक लग इन"), [language]);
  const t = {
    notConfigured: bilingualText(language, "Sign-in is not available on this build because Supabase is not configured.", "यस बिल्डमा Supabase कन्फिगर नभएकाले लग इन उपलब्ध छैन।"),
    invalidEmail: bilingualText(language, "Enter a valid email address.", "मान्य इमेल ठेगाना लेख्नुहोस्।"),
    shortPassword: bilingualText(language, "Password must be at least 6 characters.", "पासवर्ड कम्तीमा ६ क्यारेक्टर हुनुपर्छ।"),
    signingIn: bilingualText(language, "Signing in…", "लग इन गर्दै…"),
    creating: bilingualText(language, "Creating your account…", "खाता खोल्दै…"),
    signedIn: bilingualText(language, "You are signed in as a parent guardian.", "तपाईं अभिभावकको रूपमा लग इन हुनुभयो।"),
    confirmEmail: bilingualText(language, "Almost done — confirm your email from the message we just sent, then sign in.", "लगभग सकियो — हामीले पठाएको सन्देशबाट इमेल पुष्टि गर्नुहोस्, त्यसपछि लग इन गर्नुहोस्।"),
    switchToSignUp: bilingualText(language, "No account yet? Create one", "खाता छैन? नयाँ खाता बनाउनुहोस्"),
    switchToSignIn: bilingualText(language, "Already have an account? Sign in", "खाता छ? लग इन गर्नुहोस्"),
    signOut: bilingualText(language, "Sign out", "लग आउट"),
    emailLabel: bilingualText(language, "Email address", "इमेल ठेगाना"),
    passwordLabel: bilingualText(language, "Password", "पासवर्ड"),
  };

  const show = (text: string, kind: "info" | "error" | "success") => {
    setMessage(text);
    setMessageKind(kind);
  };

  const submit = async () => {
    if (!isSupabaseConfigured) { show(t.notConfigured, "error"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { show(t.invalidEmail, "error"); return; }
    if (password.length < 6) { show(t.shortPassword, "error"); return; }
    setBusy(true);
    show(mode === "sign-in" ? t.signingIn : t.creating, "info");
    try {
      if (mode === "sign-in") {
        const session = await signInGuardianWithEmail(email, password);
        setSessionEmail(session.email);
        show(t.signedIn, "success");
      } else {
        const created = await signUpGuardianWithEmail(email, password);
        if (created.needsEmailConfirmation) {
          show(t.confirmEmail, "success");
          setMode("sign-in");
        } else {
          setSessionEmail(created.email);
          show(t.signedIn, "success");
        }
      }
    } catch (error) {
      show(error instanceof Error ? error.message : t.notConfigured, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOutGuardian();
    setSessionEmail(null);
    setMessage("");
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
          {bilingualText(language, "Use the email you gave the clinic. Your account keeps your child's records safe with clinic-approved access only.", "क्लिनिकलाई दिनुभएको इमेल प्रयोग गर्नुहोस्। तपाईंको खाताले बच्चाको अभिलेख सुरक्षित राख्छ।")}
        </Text>

        {!isSupabaseConfigured ? (
          <View style={[styles.notice, { backgroundColor: "#FDECEC", borderColor: colors.warning }]}>
            <Text style={[styles.noticeTitle, { color: colors.warning }]}>{t.notConfigured}</Text>
          </View>
        ) : null}

        {sessionEmail === null ? (
          <>
            <Text style={[styles.label, { color: colors.muted }]}>{t.emailLabel}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="parent@example.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              accessibilityLabel="Parent email address"
            />
            <Text style={[styles.label, { color: colors.muted }]}>{t.passwordLabel}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              accessibilityLabel="Parent password"
            />
            <Pressable onPress={submit} disabled={busy} style={[styles.button, { backgroundColor: "#F97360" }]}>
              <Text style={styles.buttonText}>
                {busy
                  ? mode === "sign-in" ? t.signingIn : t.creating
                  : mode === "sign-in"
                    ? bilingualText(language, "Sign in", "लग इन")
                    : bilingualText(language, "Create account", "खाता बनाउनुहोस्")}
              </Text>
            </Pressable>
            <Pressable onPress={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }} disabled={busy}>
              <Text style={[styles.link, { color: colors.primary }]}>
                {mode === "sign-in" ? t.switchToSignUp : t.switchToSignIn}
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.success }]}>
            <Text style={[styles.previewTitle, { color: colors.success }]}>{t.signedIn}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {bilingualText(language, "Email", "इमेल")}: {sessionEmail}
            </Text>
            <Pressable onPress={handleSignOut}>
              <Text style={[styles.link, { color: colors.primary }]}>{t.signOut}</Text>
            </Pressable>
          </View>
        )}

        {message ? (
          <Text style={[styles.message, { color: messageKind === "error" ? colors.warning : messageKind === "success" ? colors.success : colors.muted }]}>{message}</Text>
        ) : null}
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
  button: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 16 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  link: { textAlign: "center", marginTop: 18, fontSize: 14, fontWeight: "900" },
  preview: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 26 },
  previewTitle: { fontSize: 17, fontWeight: "900" },
  message: { textAlign: "center", fontSize: 13, fontWeight: "800", lineHeight: 19, marginTop: 18 },
});
