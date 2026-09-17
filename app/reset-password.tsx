import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { bilingualText, useLanguagePreference } from "@/lib/language-preference";
import { getSupabase } from "@/lib/supabase";
import { friendlyAuthError, sendGuardianPasswordReset, updateGuardianPassword } from "@/lib/supabase-auth";

/**
 * Landing screen for password-recovery links. Supabase's client reads the
 * recovery token from the URL when the app loads, which creates a short-lived
 * session; this screen then lets the parent set a new password. Without it a
 * reset link simply dropped the parent on the home screen with no way to
 * choose a new password.
 */
export default function ResetPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const { language } = useLanguagePreference();
  const t = (english: string, nepali: string) => bilingualText(language, english, nepali);

  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = getSupabase();
        const session = client ? (await client.auth.getSession()).data.session : null;
        if (!cancelled) setHasRecoverySession(Boolean(session));
      } catch {
        if (!cancelled) setHasRecoverySession(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveNewPassword = async () => {
    if (password !== confirm) {
      setMessage({ ok: false, text: t("The two passwords do not match.", "दुई पासवर्ड मिलेन।") });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await updateGuardianPassword(password);
      setMessage({ ok: true, text: t("Password updated. You can sign in now.", "पासवर्ड परिवर्तन भयो। अब लग इन गर्न सक्नुहुन्छ।") });
      setPassword("");
      setConfirm("");
      setTimeout(() => router.replace("/parent-auth"), 1800);
    } catch (error) {
      setMessage({ ok: false, text: friendlyAuthError(error instanceof Error ? error : null) });
    } finally {
      setBusy(false);
    }
  };

  const requestNewLink = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await sendGuardianPasswordReset(email.trim());
      setMessage({ ok: true, text: t("If that email has an account, a new reset link is on its way.", "त्यो इमेलको खाता छ भने नयाँ रिसेट लिंक पठाइनेछ।") });
    } catch (error) {
      setMessage({ ok: false, text: friendlyAuthError(error instanceof Error ? error : null) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer className="p-5">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.replace("/parent-auth")} accessibilityRole="button">
          <Text style={[styles.back, { color: colors.primary }]}>‹ {t("Back to sign in", "लग इन मा फर्कनुहोस्")}</Text>
        </Pressable>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>{t("RAINBOW CHILD DEVELOPMENT CLINIC", "रेन्बो चाइल्ड डेभलपमेन्ट क्लिनिक")}</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{t("Choose a new password", "नयाँ पासवर्ड छान्नुहोस्")}</Text>

        {checking ? (
          <ActivityIndicator color={colors.primary} />
        ) : hasRecoverySession ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.muted }]}>{t("New password", "नयाँ पासवर्ड")}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              accessibilityLabel={t("New password", "नयाँ पासवर्ड")}
            />
            <Text style={[styles.label, { color: colors.muted }]}>{t("Confirm password", "पासवर्ड पुनः लेख्नुहोस्")}</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoCapitalize="none"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              accessibilityLabel={t("Confirm password", "पासवर्ड पुनः लेख्नुहोस्")}
            />
            <Pressable
              onPress={saveNewPassword}
              disabled={busy || password.length < 6}
              style={[styles.button, { backgroundColor: colors.action, opacity: busy || password.length < 6 ? 0.6 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, { color: colors.onAction }]}>
                {busy ? t("Saving…", "सुरक्षित गर्दै…") : t("Save new password", "नयाँ पासवर्ड सुरक्षित गर्नुहोस्")}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.body, { color: colors.muted }]}>
              {t(
                "This reset link has expired or was already used. Enter your email and we will send a fresh link.",
                "यो रिसेट लिंकको समय सकियो वा पहिले नै प्रयोग भयो। इमेल लेख्नुहोस्, नयाँ लिंक पठाउँछौँ।"
              )}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="parent@example.com"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              accessibilityLabel={t("Email address", "इमेल ठेगाना")}
            />
            <Pressable
              onPress={requestNewLink}
              disabled={busy}
              style={[styles.button, { backgroundColor: colors.action, opacity: busy ? 0.6 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, { color: colors.onAction }]}>
                {busy ? t("Sending…", "पठाउँदै…") : t("Send a new link", "नयाँ लिंक पठाउनुहोस्")}
              </Text>
            </Pressable>
          </View>
        )}

        {message ? (
          <Text style={[styles.feedback, { color: message.ok ? colors.success : colors.error }]}>{message.text}</Text>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 15, fontWeight: "800", marginTop: 4 },
  eyebrow: { fontSize: 11, letterSpacing: 1.4, fontWeight: "800", marginTop: 18 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "900", marginTop: 6, marginBottom: 18 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  label: { fontSize: 12, fontWeight: "800", marginTop: 4 },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  button: { minHeight: 52, borderRadius: 30, alignItems: "center", justifyContent: "center", marginTop: 14 },
  buttonText: { fontWeight: "900", fontSize: 15 },
  body: { fontSize: 14, lineHeight: 20 },
  feedback: { fontSize: 13, fontWeight: "800", marginTop: 14, lineHeight: 19 },
});
