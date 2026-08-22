import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function StaffInvitationExpiryReminders({ onOpenStaff }: { onOpenStaff: () => void }) {
  const colors = useColors(); const accounts = trpc.clinician.listClinicStaffAccounts.useQuery(undefined, { retry: false }); const now = Date.now(); const reminders = (accounts.data ?? []).filter((account) => { if (account.status === "expired") return true; if (account.status !== "invited" || !account.expiresAt) return false; return new Date(account.expiresAt).getTime() - now <= 2 * 86400000; });
  if (!reminders.length) return null;
  return <View style={[styles.card, { backgroundColor: "#FFF8E8", borderColor: colors.warning }]}><Text style={[styles.title, { color: colors.foreground }]}>Invitation renewal reminders</Text><Text style={[styles.note, { color: colors.muted }]}>These pending accounts need clinician review. Preparing a resend refreshes access timing only; it does not send an email automatically.</Text>{reminders.map((account) => <View key={account.id} style={styles.item}><Text style={[styles.email, { color: colors.foreground }]}>{account.invitedEmail}</Text><Text style={[styles.note, { color: colors.muted }]}>{account.status === "expired" ? "Invitation expired" : `Expires ${new Date(account.expiresAt as string).toLocaleString()}`} · {account.resendCount} resend preparation{account.resendCount === 1 ? "" : "s"} recorded</Text></View>)}<Pressable onPress={onOpenStaff} style={[styles.button, { borderColor: colors.warning }]}><Text style={{ color: colors.warning, fontSize: 12, fontWeight: "800" }}>Review staff invitations</Text></Pressable></View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8, marginTop: 16 }, title: { fontSize: 16, fontWeight: "800" }, note: { fontSize: 12, lineHeight: 18 }, item: { borderTopWidth: 1, borderTopColor: "#EAC778", paddingTop: 8, gap: 2 }, email: { fontSize: 13, fontWeight: "800" }, button: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, marginTop: 2 } });
