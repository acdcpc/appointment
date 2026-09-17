import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { bilingualText, useLanguagePreference } from "@/lib/language-preference";
import {
  getGuardianSession,
  resendGuardianVerificationEmail,
  sendGuardianPasswordReset,
  signInGuardianWithEmail,
  signOutGuardian,
  signUpGuardianWithEmail,
  type GuardianSession,
} from "@/lib/supabase-auth";
import { getAuthErrorMessage, isAlreadyRegisteredError, passwordProblem } from "@/lib/auth-errors";

/**
 * Parent sign-in / sign-up.
 *
 * Flow copied from the clinic's Kapoori Ka app: every outcome is stated
 * explicitly — account created and signed in, confirmation email sent (with a
 * resend action), email already registered (which switches back to sign-in), or
 * a specific error — instead of leaving the parent guessing.
 */
export default function ParentAuthScreen() {
  const colors = useColors();
  const router = useRouter();
  const { language } = useLanguagePreference();
  const t = (english: string, nepali: string) => bilingualText(language, english, nepali);

  const [session, setSession] = useState<GuardianSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    getGuardianSession().then(setSession).catch(() => setSession(null));
  }, []);

  const validateEmail = (value: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim());

  const submit = async () => {
    setAuthError(null);
    setSuccess(null);
    if (!email || !password) {
      setAuthError(t("Please enter both email and password.", "कृपया इमेल र पासवर्ड दुवै भर्नुहोस्।"));
      return;
    }
    if (!validateEmail(email)) {
      setAuthError(t("Please enter a valid email address.", "कृपया वैध इमेल ठेगाना लेख्नुहोस्।"));
      return;
    }
    if (isRegistering) {
      const problem = passwordProblem(password, language === "ne" ? "ne" : "en");
      if (problem) { setAuthError(problem); return; }
      if (password !== confirmPassword) {
        setAuthError(t("Passwords do not match.", "पासवर्ड मिलेन।"));
        return;
      }
    }
    setBusy(true);
    try {
      if (isRegistering) {
        const result = await signUpGuardianWithEmail(email.trim(), password);
        setPassword("");
        setConfirmPassword("");
        if (result.needsEmailConfirmation) {
          // Confirmation is required on this project — say so and offer a resend.
          setVerificationSent(true);
        } else {
          setSuccess(t("Account created — you are signed in.", "खाता बनियो — तपाईं लग इन हुनुभयो।"));
          const next = await getGuardianSession();
          setSession(next);
          setTimeout(() => router.replace("/(tabs)"), 1200);
        }
      } else {
        const signedIn = await signInGuardianWithEmail(email.trim(), password);
        setSession(signedIn);
        setSuccess(t("Signed in. Loading your child's details…", "लग इन भयो। बच्चाको विवरण खोल्दै…"));
        setPassword("");
        setTimeout(() => router.replace("/(tabs)"), 900);
      }
    } catch (error) {
      if (isRegistering && isAlreadyRegisteredError(error)) {
        setPassword("");
        setConfirmPassword("");
        setIsRegistering(false);
        setAuthError(
          t(
            "This email already has an account — so no new account was created. Sign in with that email and password, or tap “Forgot password?”.",
            "यो इमेलमा पहिले नै खाता छ — त्यसैले नयाँ खाता बनिएन। सोही इमेल र पासवर्डले लग इन गर्नुहोस्, वा “पासवर्ड बिर्सनुभयो?” थिच्नुहोस्।"
          )
        );
        return;
      }
      setAuthError(getAuthErrorMessage(error, language === "ne" ? "ne" : "en"));
    } finally {
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    setBusy(true);
    setAuthError(null);
    try {
      await resendGuardianVerificationEmail(email.trim());
      setSuccess(t("Confirmation email sent again — please check your inbox.", "पुष्टिकरण इमेल फेरि पठाइयो — कृपया इनबक्स हेर्नुहोस्।"));
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, language === "ne" ? "ne" : "en"));
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    setAuthError(null);
    if (!validateEmail(resetEmail)) {
      setAuthError(t("Please enter a valid email address.", "कृपया वैध इमेल ठेगाना लेख्नुहोस्।"));
      return;
    }
    setBusy(true);
    try {
      await sendGuardianPasswordReset(resetEmail.trim());
      setResetSent(true);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, language === "ne" ? "ne" : "en"));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOutGuardian();
    setSession(null);
    setSuccess(t("Signed out.", "लग आउट भयो।"));
  };

  return (
    <ScreenContainer className="p-5">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.replace("/")} accessibilityRole="button">
          <Text style={[styles.back, { color: colors.primary }]}>‹ {t("Back", "पछाडि")}</Text>
        </Pressable>

        <View style={styles.hero}>
          <Image source={require("../assets/images/icon.png")} style={styles.logo} />
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t("RAINBOW CHILD DEVELOPMENT CLINIC", "रेन्बो चाइल्ड डेभलपमेन्ट क्लिनिक")}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {showForgot ? t("Reset your password", "पासवर्ड रिसेट गर्नुहोस्") : isRegistering ? t("Create a parent account", "अभिभावक खाता बनाउनुहोस्") : t("Parent sign in", "अभिभावक लग इन")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {showForgot
              ? t("We will email you a link to choose a new password.", "नयाँ पासवर्ड छान्न लिंक इमेलमा पठाउँछौँ।")
              : t("Use the email you gave the clinic. It keeps your child's record private to you.", "क्लिनिकलाई दिनुभएको इमेल प्रयोग गर्नुहोस्। यसले बच्चाको रेकर्ड सुरक्षित राख्छ।")}
          </Text>
        </View>

        <View style={[styles.doctorBanner, { backgroundColor: colors.tealSurface, borderColor: colors.primary }]}>
          <View style={[styles.doctorBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.doctorBadgeText, { color: colors.textInverse }]}>Dr</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.doctorName, { color: colors.foreground }]}>Associate Professor Dr. Anil Ojha</Text>
            <Text style={[styles.doctorMeta, { color: colors.muted }]}>MBBS, MD, FCCH · Developmental Pediatrician</Text>
          </View>
        </View>

        {session ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.success }]}>
            <Text style={[styles.cardTitle, { color: colors.success }]}>{t("You are signed in as a parent guardian", "तपाईं अभिभावकको रूपमा लग इन हुनुहुन्छ")}</Text>
            <Text style={{ color: colors.muted }}>{session.email}</Text>
            <Pressable onPress={() => router.replace("/(tabs)")} style={[styles.button, { backgroundColor: colors.action }]} accessibilityRole="button">
              <Text style={[styles.buttonText, { color: colors.onAction }]}>{t("Open the app", "एप खोल्नुहोस्")}</Text>
            </Pressable>
            <Pressable onPress={handleSignOut} accessibilityRole="button">
              <Text style={[styles.link, { color: colors.primary }]}>{t("Sign out", "लग आउट")}</Text>
            </Pressable>
          </View>
        ) : verificationSent ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("Confirmation email sent", "पुष्टिकरण इमेल पठाइयो")}</Text>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>
              {t(
                `We sent a confirmation link to ${email.trim()}. Open it to activate the account, then sign in. Nothing was created yet.`,
                `${email.trim()} मा पुष्टिकरण लिंक पठाइयो। खाता सक्रिय गर्न लिंक खोल्नुहोस्, त्यसपछि लग इन गर्नुहोस्। अझै खाता सक्रिय भएको छैन।`
              )}
            </Text>
            <Pressable onPress={resendVerification} disabled={busy} style={[styles.button, { backgroundColor: colors.action, opacity: busy ? 0.6 : 1 }]} accessibilityRole="button">
              <Text style={[styles.buttonText, { color: colors.onAction }]}>{busy ? t("Sending…", "पठाउँदै…") : t("Resend confirmation email", "पुष्टिकरण इमेल फेरि पठाउनुहोस्")}</Text>
            </Pressable>
            <Pressable onPress={() => { setVerificationSent(false); setIsRegistering(false); setAuthError(null); setSuccess(null); }} accessibilityRole="button">
              <Text style={[styles.link, { color: colors.primary }]}>{t("Back to sign in", "लग इन मा फर्कनुहोस्")}</Text>
            </Pressable>
          </View>
        ) : showForgot ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {resetSent ? (
              <>
                <Text style={[styles.cardTitle, { color: colors.success }]}>{t("Reset link sent", "रिसेट लिंक पठाइयो")}</Text>
                <Text style={{ color: colors.muted, lineHeight: 20 }}>
                  {t("Open the link in that email to choose a new password. The link opens this app.", "नयाँ पासवर्ड छान्न इमेलको लिंक खोल्नुहोस्। लिंकले यही एप खोल्छ।")}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: colors.muted }]}>{t("Email address", "इमेल ठेगाना")}</Text>
                <TextInput
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="parent@example.com"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  accessibilityLabel={t("Email address", "इमेल ठेगाना")}
                />
                <Pressable onPress={sendReset} disabled={busy} style={[styles.button, { backgroundColor: colors.action, opacity: busy ? 0.6 : 1 }]} accessibilityRole="button">
                  <Text style={[styles.buttonText, { color: colors.onAction }]}>{busy ? t("Sending…", "पठाउँदै…") : t("Send reset link", "रिसेट लिंक पठाउनुहोस्")}</Text>
                </Pressable>
              </>
            )}
            <Pressable onPress={() => { setShowForgot(false); setResetSent(false); setAuthError(null); setSuccess(null); }} accessibilityRole="button">
              <Text style={[styles.link, { color: colors.primary }]}>{t("Back to sign in", "लग इन मा फर्कनुहोस्")}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.muted }]}>{t("Email address", "इमेल ठेगाना")}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="parent@example.com"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              accessibilityLabel="Parent email address"
            />
            <Text style={[styles.label, { color: colors.muted }]}>{t("Password", "पासवर्ड")}</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, styles.inputFlex, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                accessibilityLabel="Parent password"
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={[styles.reveal, { borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel={t("Show password", "पासवर्ड देखाउनुहोस्")}>
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>{showPassword ? t("Hide", "लुकाउनुहोस्") : t("Show", "देखाउनुहोस्")}</Text>
              </Pressable>
            </View>

            {isRegistering ? (
              <>
                <Text style={[styles.label, { color: colors.muted }]}>{t("Confirm password", "पासवर्ड पुनः लेख्नुहोस्")}</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    style={[styles.input, styles.inputFlex, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    accessibilityLabel="Confirm parent password"
                  />
                  <Pressable onPress={() => setShowConfirmPassword((v) => !v)} style={[styles.reveal, { borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel={t("Show password", "पासवर्ड देखाउनुहोस्")}>
                    <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>{showConfirmPassword ? t("Hide", "लुकाउनुहोस्") : t("Show", "देखाउनुहोस्")}</Text>
                  </Pressable>
                </View>
                <Text style={[styles.hint, { color: colors.muted }]}>
                  {t("At least 8 characters, with one letter and one number.", "कम्तिमा ८ अक्षर, एउटा अक्षर र एउटा अंक सहित।")}
                </Text>
              </>
            ) : (
              <Pressable onPress={() => { setShowForgot(true); setResetEmail(email); setAuthError(null); setSuccess(null); }} accessibilityRole="link">
                <Text style={[styles.link, { color: colors.primary }]}>{t("Forgot password?", "पासवर्ड बिर्सनुभयो?")}</Text>
              </Pressable>
            )}

            {authError ? (
              <View style={[styles.banner, { backgroundColor: colors.dangerSurface, borderColor: colors.error }]}>
                <Text style={[styles.bannerText, { color: colors.error }]}>{authError}</Text>
              </View>
            ) : null}
            {success ? (
              <View style={[styles.banner, { backgroundColor: colors.successSurface, borderColor: colors.success }]}>
                <Text style={[styles.bannerText, { color: colors.success }]}>{success}</Text>
              </View>
            ) : null}

            <Pressable onPress={submit} disabled={busy} style={[styles.button, { backgroundColor: colors.action, opacity: busy ? 0.6 : 1 }]} accessibilityRole="button" accessibilityLabel={isRegistering ? "Create account" : "Sign in"}>
              {busy ? (
                <ActivityIndicator color={colors.onAction} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.onAction }]}>
                  {isRegistering ? t("Create account", "खाता बनाउनुहोस्") : t("Sign in", "लग इन")}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setIsRegistering((v) => !v);
                setAuthError(null);
                setSuccess(null);
                setVerificationSent(false);
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.link, { color: colors.primary }]}>
                {isRegistering ? t("Already have an account? Sign in", "पहिले नै खाता छ? लग इन गर्नुहोस्") : t("New here? Create an account", "नयाँ हो? खाता बनाउनुहोस्")}
              </Text>
            </Pressable>
            <Text style={[styles.privacy, { color: colors.muted }]}>
              {t(
                "Records are visible only to guardian accounts the clinic has linked to a child.",
                "रेकर्ड क्लिनिकले बच्चासँग जोडेको अभिभावक खाताले मात्र देख्न सक्छ।"
              )}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 15, fontWeight: "800", marginTop: 4 },
  hero: { alignItems: "center", gap: 6, marginTop: 8 },
  logo: { width: 84, height: 84, borderRadius: 20 },
  eyebrow: { fontSize: 11, letterSpacing: 1.3, fontWeight: "800", marginTop: 10, textAlign: "center" },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "900", textAlign: "center" },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: 8 },
  doctorBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 16 },
  doctorBadge: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  doctorBadgeText: { fontWeight: "900", fontSize: 13 },
  doctorName: { fontSize: 14, fontWeight: "900" },
  doctorMeta: { fontSize: 12, lineHeight: 17 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 8, marginTop: 16 },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  label: { fontSize: 12, fontWeight: "800", marginTop: 6 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inputFlex: { flex: 1 },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  reveal: { minHeight: 50, paddingHorizontal: 12, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 12, lineHeight: 17 },
  link: { fontSize: 13, fontWeight: "800", marginTop: 6 },
  button: { minHeight: 54, borderRadius: 30, alignItems: "center", justifyContent: "center", marginTop: 10 },
  buttonText: { fontWeight: "900", fontSize: 16 },
  banner: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 4 },
  bannerText: { fontSize: 13, lineHeight: 19, fontWeight: "700" },
  privacy: { fontSize: 12, lineHeight: 17, marginTop: 10 },
});
