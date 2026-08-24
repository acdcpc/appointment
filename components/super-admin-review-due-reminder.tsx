import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { getAccessReviewStatus } from "@/lib/super-admin-review";
import { trpc } from "@/lib/trpc";

export function SuperAdminReviewDueReminder() {
  const colors = useColors(); const settings = trpc.administration.governanceSettings.useQuery();
  if (!settings.data) return null;
  const status = getAccessReviewStatus(settings.data.lastAccessReviewAt, settings.data.accessReviewIntervalDays); if (status.kind === "scheduled") return null;
  const title = status.kind === "never-reviewed" ? "Access review not yet recorded" : status.kind === "overdue" ? "Access review overdue" : "Access review due soon";
  const detail = status.kind === "never-reviewed" ? "No completed super-admin review is recorded. Review current application administrators, staff status, invitations, and CSV preparation evidence." : status.kind === "overdue" ? `The review due date was ${status.dueAt?.toLocaleDateString()}. Complete a manual review in this workspace.` : `The next review is due ${status.dueAt?.toLocaleDateString()} (${status.daysUntilDue} day(s)). Complete it when appropriate.`;
  return <View style={[styles.card, { backgroundColor: "#FFF8EB", borderColor: colors.warning }]}><Text style={[styles.title, { color: colors.foreground }]}>{title}</Text><Text style={[styles.detail, { color: colors.muted }]}>{detail}</Text><Text style={[styles.note, { color: colors.muted }]}>Manual review controls are below. This reminder appears only while the workspace is open; it does not send a notification, alter permissions, or prove an audit was completed.</Text></View>;
}
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 7, marginTop: 15 }, title: { fontSize: 15, fontWeight: "900" }, detail: { fontSize: 13, lineHeight: 19 }, note: { fontSize: 11, lineHeight: 16 } });
