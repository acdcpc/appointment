import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { type ClinicOperatingHour, usePediatricCare } from "@/lib/pediatric-care";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import { ClinicianIntelligence } from "@/components/clinician-intelligence";
import { ActiveGrowthReference } from "@/components/active-growth-reference";
import { ReferralTemplateBuilder } from "@/components/referral-template-builder";
import { ClinicianAuditLog } from "@/components/clinician-audit-log";
import { AuthenticatedStaffAccounts } from "@/components/authenticated-staff-accounts";
import { DashboardNotifications } from "@/components/dashboard-notifications";
import { ApprovalActivityFeed } from "@/components/approval-activity-feed";
import { ReferralDeliveryMonitor } from "@/components/referral-delivery-monitor";
import { AuditRetentionSettings } from "@/components/audit-retention-settings";
import { RetentionInsights } from "@/components/retention-insights";
import { ClinicContactSettings } from "@/components/clinic-contact-settings";
import { PatientCommunication } from "@/components/patient-communication";
import { GuardianFollowUp } from "@/components/guardian-follow-up";
import { ClinicDayFocus } from "@/components/clinic-day-focus";
import { ServicePreparationSettings } from "@/components/service-preparation-settings";
import { EarlierSlotRequests } from "@/components/earlier-slot-requests";
import { WaitlistActivity } from "@/components/waitlist-activity";
import { DailyWaitlistTriage } from "@/components/daily-waitlist-triage";
import { WeeklyWaitlistSummary } from "@/components/weekly-waitlist-summary";
import { MonthlyWaitlistConversionReport } from "@/components/monthly-waitlist-conversion-report";
import { AppointmentChangeFollowUp } from "@/components/appointment-change-follow-up";
import { TriageCapacitySettings } from "@/components/triage-capacity-settings";
import { BulkAppointmentChangeReminders } from "@/components/bulk-appointment-change-reminders";
import { WaitlistConversionTrend } from "@/components/waitlist-conversion-trend";
import { StaffCapacityHistory } from "@/components/staff-capacity-history";
import { ClinicianOperationalSync } from "@/components/clinician-operational-sync";
import { CapacityTargetAlerts } from "@/components/capacity-target-alerts";
import { PrintAccessAuditExport } from "@/components/print-access-audit-export";
import { CapacityAlertOperationsSettings } from "@/components/capacity-alert-operations-settings";
import { StaffCapacityAlertWorkspace } from "@/components/staff-capacity-alert-workspace";
import { AuditPresetManager } from "@/components/audit-preset-manager";
import { WeeklyCapacitySummaryExport } from "@/components/weekly-capacity-summary-export";
import { StaffInvitationExpiryReminders } from "@/components/staff-invitation-expiry-reminders";
import { StaffAccountActivityAudit } from "@/components/staff-account-activity-audit";
import { MonthlyStaffAccessSummary } from "@/components/monthly-staff-access-summary";
import { WeeklyCapacityReportReference } from "@/components/weekly-capacity-report-reference";
import { WeeklyCapacityReportReferenceSettings } from "@/components/weekly-capacity-report-reference-settings";

const durations = [20, 30, 45, 60];
const weekdays: ClinicOperatingHour["weekday"][] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function ClinicianLogin({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const { loading, isAuthenticated } = useAuth();
  const [starting, setStarting] = useState(false);
  const login = async () => { setStarting(true); await startOAuthLogin(); setStarting(false); };
  return <ScreenContainer className="p-5"><View style={styles.loginWrap}><Pressable onPress={onBack}><Text style={[styles.back, { color: colors.primary }]}>‹  Back</Text></Pressable><View style={[styles.loginCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.lock, { backgroundColor: "#E0F2F3" }]}><Text style={{ color: colors.primary, fontWeight: "800", fontSize: 22 }}>⌁</Text></View><Text style={[styles.loginTitle, { color: colors.foreground }]}>Clinician sign in</Text><Text style={[styles.loginText, { color: colors.muted }]}>Use Dr. Ojha’s approved clinic account to open the clinician dashboard and manage child health records.</Text>{loading ? <ActivityIndicator color={colors.primary} /> : isAuthenticated ? <Text style={[styles.noticeText, { color: colors.warning }]}>Checking clinician permissions…</Text> : <Pressable onPress={login} disabled={starting} style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: starting ? 0.7 : 1 }]}>{starting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Sign in securely</Text>}</Pressable>}<Text style={[styles.loginFootnote, { color: colors.muted }]}>Only an account assigned the clinician administrator role can proceed.</Text></View></View></ScreenContainer>;
}

export default function ClinicianDashboard() {
  const colors = useColors(); const router = useRouter(); const { focus, reportId } = useLocalSearchParams<{ focus?: "contacts" | "staff" | "email-shares"; reportId?: string }>(); const { isAuthenticated, loading: authLoading, logout } = useAuth(); const access = trpc.clinician.access.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  if (authLoading || (isAuthenticated && access.isLoading)) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} size="large" /><Text style={[styles.loadingText, { color: colors.muted }]}>Verifying clinician access…</Text></ScreenContainer>;
  if (!isAuthenticated) return <ClinicianLogin onBack={() => router.back()} />;
  if (access.error || !access.data?.allowed) return <ScreenContainer className="p-5"><View style={styles.loginWrap}><Pressable onPress={() => router.back()}><Text style={[styles.back, { color: colors.primary }]}>‹  Back</Text></Pressable><View style={[styles.loginCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.loginTitle, { color: colors.foreground }]}>Clinic access required</Text><Text style={[styles.loginText, { color: colors.muted }]}>{access.data?.reason ?? "This signed-in account is not assigned to the clinic. Ask the practice owner to create an invitation matching your account email."}</Text><Pressable onPress={logout} style={[styles.secondaryButton, { borderColor: colors.primary }]}><Text style={{ color: colors.primary, fontWeight: "800" }}>Sign out</Text></Pressable></View></View></ScreenContainer>;
  if (!access.data.isOwner) return <StaffCapacityAlertWorkspace role={access.data.staffRole ?? "receptionist"} onSignOut={logout} />;
  return <Dashboard focus={focus} reportId={reportId} />;
}

function Dashboard({ focus, reportId }: { focus?: "contacts" | "staff" | "email-shares"; reportId?: string }) {
  const colors = useColors(); const router = useRouter(); const { appointments, activeChild, clinicHours, clinicBreaks, clinicHolidays, services, updateClinicHour, updateServiceDuration, addClinicBreak, removeClinicBreak, addClinicHoliday, removeClinicHoliday, writePrescription } = usePediatricCare();
  const [selectedAppointment, setSelectedAppointment] = useState(appointments[0]?.id ?? ""); const [medication, setMedication] = useState(""); const [instructions, setInstructions] = useState(""); const [breakDay, setBreakDay] = useState<ClinicOperatingHour["weekday"]>("Tue"); const [breakStart, setBreakStart] = useState("12:30"); const [breakEnd, setBreakEnd] = useState("13:00"); const [holidayDate, setHolidayDate] = useState(""); const [holidayLabel, setHolidayLabel] = useState(""); const [message, setMessage] = useState("");
  const today = useMemo(() => appointments.filter((appointment) => appointment.date === "Tue, Aug 20"), [appointments]);
  const updateTime = (weekday: ClinicOperatingHour["weekday"], field: "start" | "end", value: string) => updateClinicHour(weekday, { [field]: value });
  const applyAiDraft = (draft: { summary: string; medication: string; instructions: string }) => { setMedication(draft.medication); setInstructions(draft.instructions); setMessage("AI draft loaded into the clinician review form. Review and approve before saving."); };
  const savePrescription = () => { const result = writePrescription({ childId: activeChild.id, appointmentId: selectedAppointment, medication, instructions }); if (!result.ok) { setMessage(result.message); return; } setMedication(""); setInstructions(""); setMessage("Prescription record saved for the selected appointment."); };
  const saveBreak = () => { const result = addClinicBreak(breakDay, breakStart, breakEnd); if (!result.ok) { setMessage(result.message); return; } setMessage("Daily break added to availability rules."); };
  const saveHoliday = () => { const result = addClinicHoliday(holidayDate, holidayLabel); if (!result.ok) { setMessage(result.message); return; } setHolidayDate(""); setHolidayLabel(""); setMessage("Clinic holiday added. Parent booking is blocked for that date."); };
  return <ScreenContainer className="p-5"><ClinicianOperationalSync /><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.back()}><Text style={[styles.back, { color: colors.primary }]}>‹  Back</Text></Pressable><Text style={[styles.eyebrow, { color: colors.primary }]}>RAINBOW CHILD DEVELOPMENT CLINIC</Text><Text style={[styles.title, { color: colors.foreground }]}>Associate Professor Dr. Anil Ojha</Text><Text style={[styles.subtitle, { color: colors.muted }]}>MBBS, MD, FCCH · Developmental Pediatrician · 9765002862</Text>
    <View style={styles.metrics}>{[[String(today.length), "Today’s visits"], [String(appointments.filter((item) => item.status === "needs-intake").length), "Needs intake"], ["1", "Active child"]].map(([value, label]) => <View key={label} style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>{label}</Text></View>)}</View>
    <ClinicDayFocus />
    <StaffInvitationExpiryReminders onOpenStaff={() => router.push({ pathname: "/clinician", params: { focus: "staff" } })} />
    {reportId ? <WeeklyCapacityReportReference internalReportId={reportId} /> : null}
    <DailyWaitlistTriage />
    <TriageCapacitySettings />
    <CapacityTargetAlerts />
    <CapacityAlertOperationsSettings />
    <WeeklyWaitlistSummary />
    <MonthlyWaitlistConversionReport />
    <WaitlistConversionTrend />
    <StaffCapacityHistory />
    <AppointmentChangeFollowUp />
    <PrintAccessAuditExport />
    <AuditPresetManager />
    <WeeklyCapacitySummaryExport />
    <WeeklyCapacityReportReferenceSettings />
    <StaffAccountActivityAudit />
    <MonthlyStaffAccessSummary />
    <BulkAppointmentChangeReminders />
    <DashboardNotifications onOpenContacts={() => router.push({ pathname: "/clinician", params: { focus: "contacts" } })} onOpenStaff={() => router.push({ pathname: "/clinician", params: { focus: "staff" } })} onOpenEmailShares={() => router.push({ pathname: "/clinician", params: { focus: "email-shares" } })} />
    <ApprovalActivityFeed />
    <ReferralDeliveryMonitor />
    {focus === "contacts" ? <ReferralTemplateBuilder /> : null}
    {focus === "staff" ? <AuthenticatedStaffAccounts /> : null}
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today’s queue</Text>{today.map((appointment) => <View key={appointment.id} style={[styles.queueCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.queueTime, { color: colors.primary }]}>{appointment.time}</Text><View style={{ flex: 1, gap: 3 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{activeChild.name} · {appointment.service}</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>{appointment.reason} · {appointment.durationMinutes} minutes</Text></View><Text style={[styles.status, { color: appointment.status === "needs-intake" ? colors.warning : colors.success }]}>{appointment.status === "needs-intake" ? "Intake" : "Confirmed"}</Text></View>)}
    <ClinicianIntelligence onApplyDraft={applyAiDraft} />
    <PatientCommunication />
    <GuardianFollowUp />
    <ServicePreparationSettings />
    <EarlierSlotRequests />
    <WaitlistActivity />
    <ActiveGrowthReference />
    {!focus ? <ReferralTemplateBuilder /> : null}
    <ClinicianAuditLog forcedFilter={focus === "email-shares" ? "email-share" : undefined} />
    <AuditRetentionSettings />
    <RetentionInsights />
    <ClinicContactSettings />
    {!focus ? <AuthenticatedStaffAccounts /> : null}
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Schedule settings</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>Changes block new bookings only. Review existing appointments separately if you change clinic availability.</Text>
    <Text style={[styles.subsection, { color: colors.foreground }]}>Clinic operating hours</Text>{clinicHours.map((hour) => <View key={hour.weekday} style={[styles.hourRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={{ width: 72 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{hour.label}</Text><Pressable onPress={() => updateClinicHour(hour.weekday, { isOpen: !hour.isOpen })}><Text style={{ color: hour.isOpen ? colors.success : colors.muted, fontSize: 12, fontWeight: "800" }}>{hour.isOpen ? "Open" : "Closed"}</Text></Pressable></View>{hour.isOpen ? <View style={styles.timeFields}><TextInput value={hour.start} onChangeText={(value) => updateTime(hour.weekday, "start", value)} style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border }]} placeholder="09:00" /><Text style={{ color: colors.muted }}>–</Text><TextInput value={hour.end} onChangeText={(value) => updateTime(hour.weekday, "end", value)} style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border }]} placeholder="17:00" /></View> : <Text style={{ color: colors.muted }}>No parent bookings</Text>}</View>)}
    <Text style={[styles.subsection, { color: colors.foreground }]}>Daily breaks</Text><View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.breakDayRow}>{weekdays.map((day) => <Pressable key={day} onPress={() => setBreakDay(day)} style={[styles.dayChip, { borderColor: breakDay === day ? colors.primary : colors.border, backgroundColor: breakDay === day ? "#E0F2F3" : colors.surface }]}><Text style={{ color: breakDay === day ? colors.primary : colors.muted, fontWeight: "800", fontSize: 12 }}>{day}</Text></Pressable>)}</View><View style={styles.breakFields}><TextInput value={breakStart} onChangeText={setBreakStart} style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border }]} placeholder="12:30" /><Text style={{ color: colors.muted }}>–</Text><TextInput value={breakEnd} onChangeText={setBreakEnd} style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border }]} placeholder="13:00" /><Pressable onPress={saveBreak} style={[styles.smallButton, { backgroundColor: colors.primary }]}><Text style={styles.smallButtonText}>Add</Text></Pressable></View>{clinicBreaks.map((item) => <View key={item.id} style={styles.settingItem}><Text style={[styles.cardMeta, { color: colors.foreground }]}>{item.weekday} · {item.start}–{item.end}</Text><Pressable onPress={() => removeClinicBreak(item.id)}><Text style={{ color: colors.error, fontWeight: "800" }}>Remove</Text></Pressable></View>)}</View>
    <Text style={[styles.subsection, { color: colors.foreground }]}>Upcoming clinic holidays</Text><View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.holidayFields}><TextInput value={holidayDate} onChangeText={setHolidayDate} style={[styles.holidayDate, { color: colors.foreground, borderColor: colors.border }]} placeholder="Tue, Aug 20" /><TextInput value={holidayLabel} onChangeText={setHolidayLabel} style={[styles.holidayLabel, { color: colors.foreground, borderColor: colors.border }]} placeholder="Holiday label" /></View><Pressable onPress={saveHoliday} style={[styles.secondaryButton, { borderColor: colors.primary }]}><Text style={{ color: colors.primary, fontWeight: "800" }}>Add clinic holiday</Text></Pressable>{clinicHolidays.map((item) => <View key={item.id} style={styles.settingItem}><View><Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.label}</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>{item.date}</Text></View><Pressable onPress={() => removeClinicHoliday(item.id)}><Text style={{ color: colors.error, fontWeight: "800" }}>Remove</Text></Pressable></View>)}</View>
    <Text style={[styles.subsection, { color: colors.foreground }]}>Appointment durations</Text>{services.map((service) => <View key={service.name} style={[styles.durationRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{service.name}</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>Select a duration</Text></View><View style={styles.durationOptions}>{durations.map((duration) => <Pressable key={duration} onPress={() => updateServiceDuration(service.name, duration)} style={[styles.duration, { borderColor: service.durationMinutes === duration ? colors.primary : colors.border, backgroundColor: service.durationMinutes === duration ? "#E0F2F3" : colors.surface }]}><Text style={{ color: service.durationMinutes === duration ? colors.primary : colors.muted, fontWeight: "800", fontSize: 12 }}>{duration}</Text></Pressable>)}</View></View>)}
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Write prescription record</Text><Text style={[styles.cardMeta, { color: colors.muted }]}>Record only clinician-verified directions. The app does not calculate doses or provide treatment advice.</Text><View style={styles.appointmentPicker}>{appointments.map((appointment) => <Pressable key={appointment.id} onPress={() => setSelectedAppointment(appointment.id)} style={[styles.appointmentOption, { borderColor: selectedAppointment === appointment.id ? colors.primary : colors.border, backgroundColor: selectedAppointment === appointment.id ? "#E0F2F3" : colors.surface }]}><Text style={{ color: colors.foreground, fontWeight: "800" }}>{appointment.date} · {appointment.time}</Text></Pressable>)}</View><TextInput value={medication} onChangeText={setMedication} placeholder="Prescription name" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} /><TextInput value={instructions} onChangeText={setInstructions} placeholder="Clinician-verified directions" placeholderTextColor={colors.muted} multiline style={[styles.instructions, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} />{message ? <Text style={[styles.message, { color: message.includes("added") || message.includes("saved") ? colors.success : colors.error }]}>{message}</Text> : null}<Pressable onPress={savePrescription} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.primaryButtonText}>Save prescription record</Text></Pressable>
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ back: { fontSize: 15, fontWeight: "800", marginBottom: 20 }, loadingText: { marginTop: 12, fontSize: 14 }, loginWrap: { flex: 1, justifyContent: "center" }, loginCard: { borderWidth: 1, borderRadius: 24, padding: 22, gap: 15 }, lock: { width: 50, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center" }, loginTitle: { fontSize: 24, fontWeight: "800" }, loginText: { fontSize: 15, lineHeight: 22 }, noticeText: { fontWeight: "800", lineHeight: 20 }, loginFootnote: { fontSize: 12, lineHeight: 18 }, eyebrow: { fontSize: 11, letterSpacing: 1.4, fontWeight: "800" }, title: { fontSize: 30, lineHeight: 36, fontWeight: "800", marginTop: 5 }, subtitle: { fontSize: 15, lineHeight: 22, marginTop: 4 }, metrics: { flexDirection: "row", gap: 8, marginTop: 22 }, metric: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 }, metricValue: { fontSize: 24, fontWeight: "800" }, sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 24, marginBottom: 10 }, subsection: { fontSize: 15, fontWeight: "800", marginTop: 16, marginBottom: 8 }, cardTitle: { fontSize: 15, fontWeight: "800" }, cardMeta: { fontSize: 13, lineHeight: 19 }, queueCard: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 8 }, queueTime: { fontWeight: "800", width: 64 }, status: { fontSize: 11, fontWeight: "800" }, hourRow: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 }, timeFields: { flexDirection: "row", alignItems: "center", gap: 5 }, timeInput: { borderWidth: 1, borderRadius: 9, width: 62, paddingVertical: 7, paddingHorizontal: 6, fontSize: 13, textAlign: "center" }, settingsCard: { borderWidth: 1, borderRadius: 16, padding: 13, gap: 10 }, breakDayRow: { flexDirection: "row", gap: 5 }, dayChip: { flex: 1, borderWidth: 1, borderRadius: 8, alignItems: "center", paddingVertical: 8 }, breakFields: { flexDirection: "row", alignItems: "center", gap: 5 }, smallButton: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 }, smallButtonText: { color: "#FFFFFF", fontWeight: "800" }, settingItem: { borderTopWidth: 1, borderTopColor: "#D9E2EC", paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, holidayFields: { flexDirection: "row", gap: 8 }, holidayDate: { flex: 1, borderWidth: 1, borderRadius: 9, padding: 10, fontSize: 13 }, holidayLabel: { flex: 1, borderWidth: 1, borderRadius: 9, padding: 10, fontSize: 13 }, durationRow: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }, durationOptions: { flexDirection: "row", gap: 4 }, duration: { minWidth: 32, borderWidth: 1, borderRadius: 9, alignItems: "center", paddingVertical: 8 }, appointmentPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, appointmentOption: { borderWidth: 1, borderRadius: 10, padding: 10 }, input: { borderWidth: 1, borderRadius: 13, padding: 13, fontSize: 15, marginTop: 12 }, instructions: { minHeight: 94, borderWidth: 1, borderRadius: 13, padding: 13, fontSize: 15, marginTop: 10, textAlignVertical: "top" }, message: { fontSize: 13, fontWeight: "800", marginTop: 10, lineHeight: 19 }, primaryButton: { borderRadius: 15, padding: 16, alignItems: "center", marginTop: 14 }, primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 }, secondaryButton: { borderWidth: 1, borderRadius: 13, padding: 12, alignItems: "center" } });
