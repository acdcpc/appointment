import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";

import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type SuggestionStatus = "all" | "submitted" | "approved" | "dismissed";
type PendingReview = { suggestionId: string; service: string; nextStatus: "approved" | "dismissed" } | null;

export function SuperAdminServiceSuggestions() {
  const colors = useColors();
  const [status, setStatus] = useState<SuggestionStatus>("submitted");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<PendingReview>(null);
  const [message, setMessage] = useState("");
  const suggestions = trpc.administration.serviceSuggestions.useQuery({ status, serviceQuery: query.trim() || undefined });
  const review = trpc.administration.reviewServiceSuggestion.useMutation();
  const rows = useMemo(() => suggestions.data ?? [], [suggestions.data]);
  const confirm = async () => {
    if (!pending) return;
    try {
      await review.mutateAsync({ suggestionId: pending.suggestionId, status: pending.nextStatus, confirmed: true });
      await suggestions.refetch();
      setMessage(`Suggestion ${pending.nextStatus}. This records an internal review only; it does not add a service or send an email.`);
    } catch {
      setMessage("The confirmed review action was not accepted by the server.");
    } finally { setPending(null); }
  };
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.title, { color: colors.foreground }]}>Service suggestions</Text>
    <Text style={[styles.note, { color: colors.muted }]}>Review only the general service name. Optional contact preferences remain protected and do not send email automatically.</Text>
    <TextInput value={query} onChangeText={setQuery} placeholder="Filter service name" placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} />
    <View style={styles.filters}>{(["submitted", "approved", "dismissed", "all"] as SuggestionStatus[]).map((value) => <Pressable key={value} onPress={() => setStatus(value)} accessibilityRole="radio" accessibilityState={{ selected: status === value }} style={[styles.filter, { borderColor: status === value ? colors.primary : colors.border, backgroundColor: status === value ? "#E0F2F3" : colors.surface }]}><Text style={{ color: status === value ? colors.primary : colors.foreground, fontWeight: "900" }}>{value}</Text></Pressable>)}</View>
    {suggestions.isLoading ? <Text style={[styles.note, { color: colors.muted }]}>Loading protected suggestions…</Text> : rows.length ? rows.map((row) => <View key={row.suggestionId} style={[styles.row, { borderTopColor: colors.border }]}><View style={styles.copy}><Text style={[styles.name, { color: colors.foreground }]}>{row.suggestedService}</Text><Text style={[styles.meta, { color: colors.muted }]}>{row.status} · requested {row.requestedAt}</Text>{row.notificationConsented && row.notificationEmail ? <Text style={[styles.meta, { color: colors.warning }]}>Contact preference: {row.notificationEmail}. No email has been sent.</Text> : <Text style={[styles.meta, { color: colors.muted }]}>No contact preference recorded.</Text>}</View>{row.status === "submitted" ? <View style={styles.actions}><Pressable onPress={() => setPending({ suggestionId: row.suggestionId, service: row.suggestedService, nextStatus: "approved" })} style={[styles.outline, { borderColor: colors.success }]}><Text style={{ color: colors.success, fontWeight: "900" }}>Approve</Text></Pressable><Pressable onPress={() => setPending({ suggestionId: row.suggestionId, service: row.suggestedService, nextStatus: "dismissed" })} style={[styles.outline, { borderColor: colors.error }]}><Text style={{ color: colors.error, fontWeight: "900" }}>Dismiss</Text></Pressable></View> : null}</View>) : <Text style={[styles.note, { color: colors.muted }]}>No suggestions match this protected filter.</Text>}
    {message ? <Text style={[styles.note, { color: message.includes("not") ? colors.error : colors.success }]}>{message}</Text> : null}
    <Modal transparent visible={pending !== null} animationType="fade" onRequestClose={() => setPending(null)}><View style={styles.backdrop}><View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.title, { color: colors.foreground }]}>Confirm suggestion review</Text><Text style={[styles.note, { color: colors.muted }]}>{pending?.service} will be marked {pending?.nextStatus}. This does not add the service, contact the requester, or send any email.</Text><View style={styles.actions}><Pressable onPress={() => setPending(null)} style={[styles.outline, { borderColor: colors.border }]}><Text style={{ color: colors.muted, fontWeight: "900" }}>Cancel</Text></Pressable><Pressable onPress={confirm} disabled={review.isPending} style={[styles.confirm, { backgroundColor: pending?.nextStatus === "dismissed" ? colors.error : colors.primary, opacity: review.isPending ? 0.7 : 1 }]}><Text style={styles.confirmText}>{review.isPending ? "Saving…" : "Confirm"}</Text></Pressable></View></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 10, marginTop: 15 }, title: { fontSize: 17, fontWeight: "900" }, note: { fontSize: 12, lineHeight: 18 }, input: { minHeight: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontSize: 13 }, filters: { flexDirection: "row", gap: 7, flexWrap: "wrap" }, filter: { minHeight: 34, borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, alignItems: "center", justifyContent: "center" }, row: { borderTopWidth: 1, paddingTop: 10, gap: 8 }, copy: { gap: 3 }, name: { fontSize: 14, fontWeight: "900" }, meta: { fontSize: 11, lineHeight: 16 }, actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" }, outline: { minHeight: 38, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" }, backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.48)", justifyContent: "center", padding: 22 }, modal: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 }, confirm: { minHeight: 40, borderRadius: 10, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" }, confirmText: { color: "#FFFFFF", fontWeight: "900" } });
