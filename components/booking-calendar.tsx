import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { formatClinicDay, MONTH_LONG, parseClinicDay, WEEKDAY_SHORT } from "@/lib/clinic-days";
import { bilingualText, useLanguagePreference } from "@/lib/language-preference";

/**
 * Month calendar for booking.
 *
 * The booking screen used to offer only the next four open days as chips, so a
 * parent who wanted a specific date had no way to ask for it. This is a plain
 * month grid — no date-picker dependency — where open days are selectable,
 * today is outlined, and past days, closed weekdays and holidays are dimmed.
 * The clinic's own hours are the constraint, so a visitor can pick any open
 * day within the booking horizon, not just the next few.
 */
const CELL = "14.2857%";
const MAX_DAYS_AHEAD = 240;

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function BookingCalendar({
  value,
  onSelect,
  closedWeekdays,
  closedDates,
  maxDaysAhead = MAX_DAYS_AHEAD,
}: {
  value: string;
  onSelect: (day: string) => void;
  closedWeekdays: readonly string[];
  closedDates: readonly string[];
  maxDaysAhead?: number;
}) {
  const colors = useColors();
  const { language } = useLanguagePreference();
  const t = (english: string, nepali: string) => bilingualText(language, english, nepali);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const lastSelectable = useMemo(() => {
    const limit = new Date(today);
    limit.setDate(limit.getDate() + maxDaysAhead);
    return limit;
  }, [today, maxDaysAhead]);

  const [cursor, setCursor] = useState(() => startOfMonth(parseClinicDay(value, today) ?? today));

  // Follow the selected day when it moves into another month (e.g. the default
  // day is chosen after mount); manual month browsing is left untouched.
  useEffect(() => {
    const selected = parseClinicDay(value, today);
    if (!selected) return;
    setCursor((current) =>
      selected.getFullYear() === current.getFullYear() && selected.getMonth() === current.getMonth()
        ? current
        : startOfMonth(selected),
    );
  }, [value, today]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = new Date(year, month, 1).getDay();
  const cells: Array<Date | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ];

  const canGoPrev = startOfMonth(cursor) > startOfMonth(today);
  const canGoNext = addMonths(cursor, 1) <= startOfMonth(lastSelectable);

  const stateFor = (day: Date) => {
    if (day < today || day > lastSelectable) return "disabled" as const;
    if (closedWeekdays.includes(WEEKDAY_SHORT[day.getDay()]) || closedDates.includes(formatClinicDay(day))) {
      return "closed" as const;
    }
    return "open" as const;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Pressable
          disabled={!canGoPrev}
          onPress={() => setCursor((current) => addMonths(current, -1))}
          accessibilityRole="button"
          accessibilityLabel={t("Previous month", "अघिल्लो महिना")}
          style={[styles.navButton, { borderColor: canGoPrev ? colors.primary : colors.border, opacity: canGoPrev ? 1 : 0.4 }]}
        >
          <Text style={{ color: canGoPrev ? colors.primary : colors.muted, fontWeight: "900", fontSize: 16 }}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>{MONTH_LONG[month]} {year}</Text>
        <Pressable
          disabled={!canGoNext}
          onPress={() => setCursor((current) => addMonths(current, 1))}
          accessibilityRole="button"
          accessibilityLabel={t("Next month", "अर्को महिना")}
          style={[styles.navButton, { borderColor: canGoNext ? colors.primary : colors.border, opacity: canGoNext ? 1 : 0.4 }]}
        >
          <Text style={{ color: canGoNext ? colors.primary : colors.muted, fontWeight: "900", fontSize: 16 }}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_SHORT.map((weekday) => (
          <Text key={weekday} style={[styles.weekday, { color: colors.muted }]}>{weekday}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (!day) return <View key={`empty-${index}`} style={styles.cellWrap} />;
          const state = stateFor(day);
          const selected = formatClinicDay(day) === value;
          const isToday = day.getTime() === today.getTime();
          return (
            <View key={formatClinicDay(day)} style={styles.cellWrap}>
              <Pressable
                disabled={state !== "open"}
                onPress={() => onSelect(formatClinicDay(day))}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: state !== "open" }}
                accessibilityLabel={`${formatClinicDay(day)}${state === "open" ? "" : t(" (closed)", " (बन्द)")}`}
                style={[
                  styles.cell,
                  {
                    borderColor: selected || isToday ? colors.primary : state === "open" ? colors.border : "transparent",
                    borderWidth: selected ? 1 : isToday ? 1.5 : 1,
                    backgroundColor: selected ? colors.primary : state === "open" ? colors.background : "transparent",
                    opacity: state === "open" ? 1 : 0.45,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected ? colors.textInverse : state === "open" ? colors.foreground : colors.muted,
                    fontWeight: selected ? "900" : "700",
                    fontSize: 13,
                  }}
                >
                  {day.getDate()}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text style={[styles.legend, { color: colors.muted }]}>
        {t(
          "Open days are selectable. Closed days and past dates are dimmed; today is outlined.",
          "खुला दिनहरू छान्न मिल्छ। बन्द दिन र गएका मिति धमिला छन्; आजको दिन रेखांकित छ।",
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8, marginTop: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navButton: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 14, fontWeight: "900" },
  weekRow: { flexDirection: "row" },
  weekday: { width: CELL, textAlign: "center", fontSize: 11, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cellWrap: { width: CELL, alignItems: "center", paddingVertical: 2 },
  cell: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  legend: { fontSize: 11, lineHeight: 15 },
});
