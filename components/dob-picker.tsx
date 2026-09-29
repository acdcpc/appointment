import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { formatClinicDate, ageInMonths, todayClinicDate } from "@/lib/growth-measurements";
import { MONTH_SHORT } from "@/lib/clinic-days";
import {
  adToBs, BS_MONTH_NAMES, bsMonthDays, bsToAd, bsYearsForChildren, formatBsDate, isPlausibleChildBirthDate,
} from "@/lib/nepali-date";
import { bilingualText, useLanguagePreference } from "@/lib/language-preference";

/**
 * Date-of-birth entry for booking.
 *
 * Parents used to have to type "14 May 2022" into a text field — awkward on a
 * phone, impossible when they know the date in Bikram Sambat. This replaces it
 * with three scrollable picker rows (year / month / day), an English ⇄ Nepali
 * calendar switch, and an explicit "date of birth not known — I'll enter the
 * age" option. Result: once a valid date is picked, the caller receives the
 * age in years and months; the picker also shows the date in both calendars.
 */
const MAX_AGE_SPAN = 20;

type Resolved = { years: number; months: number; dobAd: string; dobBs: string };

export function DobPicker({ onResolved }: { onResolved: (result: Resolved | null) => void }) {
  const colors = useColors();
  const { language } = useLanguagePreference();
  const t = (english: string, nepali: string) => bilingualText(language, english, nepali);

  const [calendar, setCalendar] = useState<"AD" | "BS">("AD");
  const [unknown, setUnknown] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);

  const today = useMemo(() => new Date(), []);
  const adYears = useMemo(() => Array.from({ length: MAX_AGE_SPAN + 1 }, (_, index) => today.getFullYear() - index), [today]);
  const bsYears = useMemo(() => bsYearsForChildren(today, MAX_AGE_SPAN), [today]);

  const maxDay = useMemo(() => {
    if (year === null || month === null) return 31;
    if (calendar === "AD") return new Date(year, month + 1, 0).getDate();
    return bsMonthDays(year, month) ?? 31;
  }, [calendar, year, month]);
  const dayOptions = useMemo(() => Array.from({ length: maxDay }, (_, index) => index + 1), [maxDay]);

  const resolved = useMemo(() => {
    if (unknown || year === null || month === null || day === null) return null;
    if (day > maxDay) return null;
    if (calendar === "AD") {
      const ad = new Date(year, month, day);
      if (ad.getMonth() !== month || ad.getDate() !== day) return null;
      if (!isPlausibleChildBirthDate(ad, today)) return null;
      return ad;
    }
    const ad = bsToAd({ year, month, day });
    if (!ad || !isPlausibleChildBirthDate(ad, today)) return null;
    return ad;
  }, [unknown, calendar, year, month, day, maxDay, today]);

  const age = useMemo(() => {
    if (!resolved) return null;
    const months = ageInMonths(formatClinicDate(resolved), todayClinicDate());
    if (months === null || months < 0) return null;
    return { years: Math.floor(months / 12), months: months % 12 };
  }, [resolved]);

  /** Everything the caller stores: age plus the date in both calendars. */
  const payload = useMemo<Resolved | null>(() => {
    if (!resolved || !age) return null;
    return { years: age.years, months: age.months, dobAd: formatClinicDate(resolved), dobBs: formatBsDate(adToBs(resolved)) };
  }, [resolved, age]);

  // Tell the caller whenever the resolved date changes (without making the
  // caller's callback identity part of the effect dependencies).
  const onResolvedRef = useRef(onResolved);
  useEffect(() => { onResolvedRef.current = onResolved; });
  useEffect(() => {
    onResolvedRef.current(payload);
  }, [payload]);

  const pick = (setter: (value: number) => void, value: number) => { setter(value); };

  const switchCalendar = (next: "AD" | "BS") => {
    if (next === calendar) return;
    setCalendar(next);
    setYear(null);
    setMonth(null);
    setDay(null);
  };

  const preview = useMemo(() => {
    if (!payload) return null;
    const ageText = `${payload.years} ${t("y", "वर्ष")} ${payload.months} ${t("m", "महिना")}`;
    return t(
      `${payload.dobAd} (A.D.) · ${payload.dobBs} (B.S.) · age ${ageText}`,
      `${payload.dobBs} (वि.सं.) · ${payload.dobAd} (ई.सं.) · उमेर ${ageText}`,
    );
  }, [payload, t]);

  const hint = unknown
    ? t("Age will be used instead — fill it in below.", "उमेर प्रयोग हुनेछ — तल भर्नुहोस्।")
    : year === null || month === null || day === null
      ? t("Scroll each row and pick the year, month and day.", "प्रत्येक पङ्क्ति स्क्रोल गरी वर्ष, महिना र दिन छान्नुहोस्।")
      : preview ?? t("That day does not exist in this month — pick another.", "यो महिनामा त्यो दिन हुँदैन — अर्को छान्नुहोस्।");

  const chip = (label: string, selected: boolean, onPress: () => void, key: string | number, accessibilityLabel: string) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.chip, {
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.tealSurface : colors.surface,
      }]}
    >
      <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: "800", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.modeRow}>
        {([["AD", t("English date (A.D.)", "अंग्रेजी मिति (ई.सं.)")], ["BS", t("Nepali date (B.S.)", "नेपाली मिति (वि.सं.)")]] as const).map(([mode, label]) =>
          chip(label, calendar === mode, () => switchCalendar(mode), mode, label))}
      </View>

      <Pressable
        onPress={() => setUnknown((current) => !current)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: unknown }}
        style={styles.checkRow}
      >
        <View style={[styles.checkBox, { borderColor: unknown ? colors.primary : colors.border, backgroundColor: unknown ? colors.primary : "transparent" }]}>
          {unknown ? <Text style={{ color: colors.textInverse, fontSize: 12, fontWeight: "900" }}>✓</Text> : null}
        </View>
        <Text style={[styles.checkText, { color: colors.muted }]}>
          {t("Date of birth not known — I will enter the age instead", "जन्म मिति थाहा छैन — उमेर लेख्नेछु")}
        </Text>
      </Pressable>

      {!unknown ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chipRow} accessibilityLabel={t("Birth year", "जन्म वर्ष")}>
            {(calendar === "AD" ? adYears : bsYears).map((option) =>
              chip(String(option), option === year, () => pick(setYear, option), option, `${t("Year", "वर्ष")} ${option}`))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chipRow} accessibilityLabel={t("Birth month", "जन्म महिना")}>
            {(calendar === "AD" ? MONTH_SHORT : BS_MONTH_NAMES).map((label, index) =>
              chip(label, index === month, () => pick(setMonth, index), label, `${t("Month", "महिना")} ${label}`))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chipRow} accessibilityLabel={t("Birth day", "जन्म दिन")}>
            {dayOptions.map((option) =>
              chip(String(option), option === day, () => pick(setDay, option), option, `${t("Day", "दिन")} ${option}`))}
          </ScrollView>
        </>
      ) : null}

      <Text style={[styles.hint, { color: resolved ? colors.success : colors.muted }]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 6 },
  modeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  checkText: { flex: 1, fontSize: 12, lineHeight: 17 },
  chipScroller: { flexGrow: 0, flexShrink: 0 },
  chipRow: { gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minHeight: 40, justifyContent: "center" },
  hint: { fontSize: 12, lineHeight: 17 },
});
