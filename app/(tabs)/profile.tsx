import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { bilingualText, useLanguagePreference } from "@/lib/language-preference";
import { getGuardianSession, signOutGuardian, type GuardianSession } from "@/lib/supabase-auth";
import { loadMyBookingRequests, parseAgeParts, updateMyBookingRequest, type BookingDetails, type BookingRequest } from "@/lib/booking-requests";
import { isAuthorityRole, useAuthorityRole } from "@/lib/authority-role";
import { getSupabase, signOutSupabase } from "@/lib/supabase";
import { useThemeContext } from "@/lib/theme-provider";
import { useTextSize, type TextSizeLevel } from "@/lib/text-size";

/**
 * Guardian profile. Shows the real signed-in account (Supabase email +
 * password) and a functional child editor — no hardcoded demo identity.
 */
export default function ProfileTab() {
  const colors = useColors();
  const router = useRouter();
  const { language } = useLanguagePreference();
  const t = (english: string, nepali: string) => bilingualText(language, english, nepali);
  const { childrenSource, children, activeChild, setActiveChild, updateChildProfile } = usePediatricCare();
  const { colorScheme, setColorScheme } = useThemeContext();
  const { level: textSize, setLevel: setTextSize } = useTextSize();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [session, setSession] = useState<GuardianSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(activeChild.name);
  const [allergiesDraft, setAllergiesDraft] = useState(activeChild.allergies);
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Booking details the parent submitted with their last visit request; the
  // clinic sees the same values, so editing here is how they stay correct.
  const [bookingRequest, setBookingRequest] = useState<BookingRequest | null>(null);
  const [bookingDraft, setBookingDraft] = useState<BookingDetails | null>(null);
  const [bookingMessage, setBookingMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Staff get one more route into the admin panel, right at the top of Profile.
  const authorityRole = useAuthorityRole();
  useEffect(() => {
    let cancelled = false;
    loadMyBookingRequests().then((rows) => { if (!cancelled) setBookingRequest(rows[0] ?? null); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const editBooking = () => {
    if (!bookingRequest) return;
    const age = parseAgeParts(bookingRequest.childAge);
    setBookingDraft({
      childName: bookingRequest.childName,
      childAgeYears: age.years,
      childAgeMonths: age.months,
      childSex: bookingRequest.childSex,
      weightKg: bookingRequest.weightKg ?? "",
      heightCm: bookingRequest.heightCm ?? "",
      guardianPhone: bookingRequest.guardianPhone,
      guardianEmail: bookingRequest.guardianEmail ?? "",
    });
    setBookingMessage(null);
  };
  const saveBooking = async () => {
    if (!bookingRequest || !bookingDraft) return;
    const result = await updateMyBookingRequest(bookingRequest.id, bookingDraft);
    setBookingMessage({ ok: result.ok, text: result.message });
    if (result.ok) {
      setBookingRequest({ ...bookingRequest, ...bookingDraft, weightKg: Number(bookingDraft.weightKg) || undefined, heightCm: Number(bookingDraft.heightCm) || undefined } as BookingRequest);
      setBookingDraft(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    getGuardianSession()
      .then((s) => { if (!cancelled) { setSession(s); setSessionLoaded(true); } })
      .catch(() => { if (!cancelled) { setSession(null); setSessionLoaded(true); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setNameDraft(activeChild.name);
    setAllergiesDraft(activeChild.allergies);
    setEditingName(false);
    setSaveMessage(null);
  }, [activeChild.id]);

  const guardianEmail = session?.email ?? null;
  const initials = guardianEmail
    ? guardianEmail.slice(0, 2).toUpperCase()
    : activeChild.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const saveChild = async () => {
    const result = await updateChildProfile(activeChild.id, { name: nameDraft, allergies: allergiesDraft });
    setSaveMessage(result.ok
      ? { ok: true, text: t("Child details saved.", "बच्चाको विवरण सुरक्षित भयो।") }
      : { ok: false, text: result.message });
  };

  const handleSignOut = async () => {
    await signOutGuardian();
    setSession(null);
  };

  return (
    <ScreenContainer className="p-5">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          {t("RAINBOW CHILD DEVELOPMENT CLINIC", "रेन्बो चाइल्ड डेभलपमेन्ट क्लिनिक")}
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{t("Profile", "प्रोफाइल")}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {t("Your account and your child's care details.", "तपाईंको खाता र बच्चाको हेरचाह विवरण।")}
        </Text>

        <View style={[styles.profile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.textInverse }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {sessionLoaded
                ? guardianEmail ?? t("Not signed in", "लग इन गरिएको छैन")
                : t("Checking account…", "खाता जाँच गर्दै…")}
            </Text>
            <Text style={{ color: colors.muted }}>
              {sessionLoaded
                ? guardianEmail
                  ? t("Signed in as parent guardian", "अभिभावकको रूपमा लग इन")
                  : t("Sign in to sync appointments and records", "भेट र रेकर्ड सिंक गर्न लग इन गर्नुहोस्")
                : ""}
            </Text>
          </View>
          {sessionLoaded && !session ? (
            <Pressable onPress={() => router.push("/parent-auth")} style={[styles.actionButton, { backgroundColor: colors.action }]} accessibilityRole="button">
              <Text style={[styles.actionButtonText, { color: colors.onAction }, { color: colors.textInverse }]}>{t("Sign in", "लग इन")}</Text>
            </Pressable>
          ) : null}
          {session ? (
            <Pressable onPress={handleSignOut} style={[styles.actionButton, { borderColor: colors.border }]} accessibilityRole="button">
              <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 13 }}>{t("Sign out", "लग आउट")}</Text>
            </Pressable>
          ) : null}
        </View>

        {isAuthorityRole(authorityRole) ? (
          <>
            <Text style={[styles.section, { color: colors.foreground }]}>{t("Clinic staff", "क्लिनिक कर्मचारी")}</Text>
            <Pressable onPress={() => router.push("/clinician" as never)} accessibilityRole="button" style={[styles.card, { backgroundColor: colors.tealSurface, borderColor: colors.primary, flexDirection: "row", alignItems: "center", gap: 12 }]}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("Open the clinic admin panel", "क्लिनिक एडमिन प्यानल खोल्नुहोस्")}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{t("Appointments, booking requests, growth and staff", "भेट, बुकिङ अनुरोध, वृद्धि र कर्मचारी")}</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
            </Pressable>
          </>
        ) : null}

        <Text style={[styles.section, { color: colors.foreground }]}>{t("Appearance & text size", "देखावट र अक्षरको आकार")}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("Night mode", "रात्री मोड")}</Text>
          <View style={styles.choiceRow}>
            {(["light", "dark", "system"] as const).map((option) => (
              <Pressable key={option} onPress={() => setColorScheme(option === "system" ? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : option)} style={[styles.choiceChip, { borderColor: colorScheme === option ? colors.primary : colors.border, backgroundColor: colorScheme === option ? colors.tealSurface : colors.surface }]} accessibilityRole="button">
                <Text style={{ color: colorScheme === option ? colors.primary : colors.muted, fontWeight: "800", fontSize: 13 }}>
                  {option === "light" ? t("Light", "उज्यालो") : option === "dark" ? t("Dark", "अँध्यारो") : t("System", "प्रणाली")}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground, marginTop: 12 }]}>{t("Text size", "अक्षरको आकार")}</Text>
          <View style={styles.choiceRow}>
            {(["small", "normal", "large"] as TextSizeLevel[]).map((option) => (
              <Pressable key={option} onPress={() => setTextSize(option)} style={[styles.choiceChip, { borderColor: textSize === option ? colors.primary : colors.border, backgroundColor: textSize === option ? colors.tealSurface : colors.surface }]} accessibilityRole="button">
                <Text style={{ color: textSize === option ? colors.primary : colors.muted, fontWeight: "800", fontSize: 13 }}>
                  {option === "small" ? "A−" : option === "normal" ? "A" : "A+"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {childrenSource === "server" ? (
          <>
<Text style={[styles.section, { color: colors.foreground }]}>{t("Children & dependents", "बच्चाहरू")}</Text>
        <View style={styles.childPicker}>
          {children.map((child) => {
            const selected = child.id === activeChild.id;
            return (
              <Pressable
                key={child.id}
                onPress={() => setActiveChild(child.id)}
                accessibilityRole="button"
                style={[styles.childChip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.tealSurface : colors.surface }]}
              >
                <Text style={{ color: selected ? colors.primary : colors.muted, fontWeight: "800", fontSize: 13 }}>{child.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("Child name", "बच्चाको नाम")}</Text>
          {editingName ? (
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              accessibilityLabel={t("Child name", "बच्चाको नाम")}
            />
          ) : (
            <Text style={[styles.childNameValue, { color: colors.foreground }]}>{activeChild.name}</Text>
          )}
          <Text style={[styles.cardTitle, { color: colors.foreground, marginTop: 14 }]}>{t("Allergy notes", "एलर्जी टिपोट")}</Text>
          <TextInput
            value={allergiesDraft}
            onChangeText={setAllergiesDraft}
            multiline
            style={[styles.input, styles.inputMultiline, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            accessibilityLabel={t("Allergy notes", "एलर्जी टिपोट")}
          />
          {saveMessage ? (
            <Text style={{ color: saveMessage.ok ? colors.success : colors.error, fontWeight: "800", fontSize: 13 }}>{saveMessage.text}</Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            {!editingName ? (
              <Pressable onPress={() => { setEditingName(true); setSaveMessage(null); }} style={[styles.actionButton, { borderColor: colors.primary }]} accessibilityRole="button">
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>{t("Edit", "सम्पादन")}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={saveChild} style={[styles.actionButton, { backgroundColor: colors.primary }]} accessibilityRole="button">
              <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>{t("Save changes", "परिवर्तन सुरक्षित")}</Text>
            </Pressable>
          </View>
        </View>
          </>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("Your child\u2019s care details", "\u0924\u092a\u093e\u0908\u0901\u0915\u094b \u092c\u091a\u094d\u091a\u093e\u0915\u094b \u0935\u093f\u0935\u0930\u0923")}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
              {t("Sign in with the email the clinic has on file. Child profiles appear here once your account is linked \u2014 no sample names are shown.", "\u0915\u094d\u0932\u093f\u0928\u093f\u0915\u092e\u093e \u0930\u0939\u0947\u0915\u094b \u0907\u092e\u0947\u0932\u0932\u0947 \u0932\u0917 \u0907\u0928 \u0917\u0930\u094d\u0928\u0941\u0939\u094b\u0938\u094d\u0964 \u0916\u093e\u0924\u093e \u091c\u094b\u0921\u093f\u090f\u092a\u091b\u093f \u092c\u091a\u094d\u091a\u093e\u0915\u094b \u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932 \u092f\u0939\u093e\u0901 \u0926\u0947\u0916\u093f\u0928\u094d\u091b\u0964")}
            </Text>
          </View>
        )}
        {bookingRequest ? (
          <>
            <Text style={[styles.section, { color: colors.foreground }]}>{t("Visit details", "भेटको विवरण")}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
                {t("The details you gave when you booked. The clinic sees the same values.", "भेट बुक गर्दा दिनुभएको विवरण। क्लिनिकले पनि यही देख्छ।")}
              </Text>
              <Text style={[styles.cardTitle, { color: colors.foreground, marginTop: 10 }]}>{t("Child", "बच्चा")}</Text>
              {bookingDraft ? (
                <>
                  <TextInput value={bookingDraft.childName} onChangeText={(value) => setBookingDraft({ ...bookingDraft, childName: value })} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel={t("Child name", "बच्चाको नाम")} />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput value={bookingDraft.childAgeYears} onChangeText={(value) => setBookingDraft({ ...bookingDraft, childAgeYears: value })} keyboardType="number-pad" placeholder="Years" placeholderTextColor={colors.muted} style={[styles.input, { flex: 1, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel={t("Child age in years", "बच्चाको उमेर वर्ष")} />
                    <TextInput value={bookingDraft.childAgeMonths} onChangeText={(value) => setBookingDraft({ ...bookingDraft, childAgeMonths: value })} keyboardType="number-pad" placeholder="Months" placeholderTextColor={colors.muted} style={[styles.input, { flex: 1, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel={t("Child age in months", "बच्चाको उमेर महिना")} />
                  </View>
                  <TextInput value={String(bookingDraft.weightKg ?? "")} onChangeText={(value) => setBookingDraft({ ...bookingDraft, weightKg: value })} keyboardType="decimal-pad" style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel={t("Weight in kilograms", "तौल किलोग्राम")} />
                  <TextInput value={String(bookingDraft.heightCm ?? "")} onChangeText={(value) => setBookingDraft({ ...bookingDraft, heightCm: value })} keyboardType="decimal-pad" style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel={t("Height in centimetres", "उचाइ सेन्टिमिटर")} />
                  <TextInput value={bookingDraft.guardianPhone} onChangeText={(value) => setBookingDraft({ ...bookingDraft, guardianPhone: value })} keyboardType="phone-pad" style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel={t("Parent contact number", "अभिभावकको सम्पर्क नम्बर")} />
                  <TextInput value={bookingDraft.guardianEmail ?? ""} onChangeText={(value) => setBookingDraft({ ...bookingDraft, guardianEmail: value })} autoCapitalize="none" keyboardType="email-address" style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} accessibilityLabel={t("Email optional", "इमेल (वैकल्पिक)")} />
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                    <Pressable onPress={saveBooking} style={[styles.actionButton, { backgroundColor: colors.action }]} accessibilityRole="button">
                      <Text style={[styles.actionButtonText, { color: colors.onAction }]}>{t("Save", "सुरक्षित")}</Text>
                    </Pressable>
                    <Pressable onPress={() => setBookingDraft(null)} style={[styles.actionButton, { borderColor: colors.border }]} accessibilityRole="button">
                      <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 13 }}>{t("Cancel", "रद्द")}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>
                    {[bookingRequest.childName, bookingRequest.childAge, bookingRequest.childSex === "male" ? t("Boy", "छोरा") : t("Girl", "छोरी")].join(" · ")}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>
                    {[bookingRequest.weightKg !== undefined ? `${bookingRequest.weightKg} kg` : null, bookingRequest.heightCm !== undefined ? `${bookingRequest.heightCm} cm` : null].filter(Boolean).join(" · ") || t("No weight or height given", "तौल वा उचाइ दिइएको छैन")}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{bookingRequest.guardianPhone}{bookingRequest.guardianEmail ? ` · ${bookingRequest.guardianEmail}` : ""}</Text>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>{bookingRequest.service} · {bookingRequest.preferredDate} · {bookingRequest.preferredTime}</Text>
                  <Pressable onPress={editBooking} style={[styles.actionButton, { borderColor: colors.primary, marginTop: 6 }]} accessibilityRole="button">
                    <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>{t("Edit details", "विवरण सच्याउनुहोस्")}</Text>
                  </Pressable>
                </>
              )}
              {bookingMessage ? <Text style={{ color: bookingMessage.ok ? colors.success : colors.error, fontWeight: "800", fontSize: 13 }}>{bookingMessage.text}</Text> : null}
            </View>
          </>
        ) : null}

        <Text style={[styles.section, { color: colors.foreground }]}>{t("Danger zone", "जोखिम क्षेत्र")}</Text>
        <View style={[styles.card, { backgroundColor: colors.dangerSurface, borderColor: colors.error }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("Delete my account", "मेरो खाता मेटाउनुहोस्")}</Text>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
            {t("Removes your account and child profile from the app. A record is kept for the super-admin.", "खाता र बच्चाको प्रोफाइल एपबाट हट्छ। रेकर्ड सुपर-एडमिनकहाँ सुरक्षित रहन्छ।")}
          </Text>
          {confirmDelete ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={async () => {
                setConfirmDelete(false);
                try {
                  const client = getSupabase();
                  if (!client) throw new Error(t("Supabase is not configured on this build.", "यस बिल्डमा Supabase कन्फिगर छैन।"));
                  const { error: deleteError } = await client.rpc("delete_own_guardian_account");
                  if (deleteError) throw deleteError;
                  await signOutGuardian(); await signOutSupabase();
                  router.replace("/parent-auth");
                } catch (e) {
                  setSaveMessage({ ok: false, text: e instanceof Error ? e.message : t("Could not delete the account.", "खाता मेट्न सकिएन।") });
                }
              }} style={[styles.actionButton, { backgroundColor: colors.error }]} accessibilityRole="button">
                <Text style={{ color: colors.textInverse, fontWeight: "800", fontSize: 13 }}>{t("Yes, delete permanently", "हो, मेटाउनुहोस्")}</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmDelete(false)} style={[styles.actionButton, { borderColor: colors.border }]} accessibilityRole="button">
                <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 13 }}>{t("Cancel", "रद्द")}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmDelete(true)} style={[styles.actionButton, { borderColor: colors.error }]} accessibilityRole="button">
              <Text style={{ color: colors.error, fontWeight: "800", fontSize: 13 }}>{t("Delete my account", "मेरो खाता मेटाउनुहोस्")}</Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>{t("Practice information", "क्लिनिक जानकारी")}</Text>
        <Pressable onPress={() => router.push("/about")} accessibilityRole="link" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("Dr. Anil Ojha's Practice", "डा. अनिल ओझाको क्लिनिक")}</Text>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            {t("Pediatric and child development care · hours, closures, and contact details", "बाल र बाल विकास हेरचाह · समय, बन्द दिन र सम्पर्क विवरण")}
          </Text>
          <Text style={{ color: colors.primary, fontWeight: "700", marginTop: 4 }}>{t("Open clinic profile  ›", "क्लिनिक प्रोफाइल खोल्नुहोस्  ›")}</Text>
        </Pressable>

        <Text style={[styles.section, { color: colors.foreground }]}>{t("Practice team", "क्लिनिक टिम")}</Text>
        <Pressable onPress={() => router.push("/clinician")} style={[styles.card, { backgroundColor: colors.tealSurface, borderColor: colors.primary }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("Dr. Ojha clinician dashboard", "डा. ओझा क्लिनिसियन ड्यासबोर्ड")}</Text>
            <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
          </View>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, letterSpacing: 1.4, fontWeight: "800", marginTop: 6 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "800", marginTop: 5 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 4, marginBottom: 20 },
  profile: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "800" },
  actionButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 30, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent" },
  actionButtonText: { fontWeight: "800", fontSize: 13 },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8, marginBottom: 10 },
  childPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  childChip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, justifyContent: "center" },
  childNameValue: { fontSize: 16, fontWeight: "700" },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  inputMultiline: { minHeight: 72, textAlignVertical: "top", paddingVertical: 10 },
  section: { fontSize: 18, fontWeight: "800", marginTop: 24, marginBottom: 12 },
  choiceRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  choiceChip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, justifyContent: "center" },
});
