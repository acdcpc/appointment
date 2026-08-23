import { useEffect, useRef } from "react";

import { useAuth } from "@/hooks/use-auth";
import { type PediatricAppointment, usePediatricCare } from "@/lib/pediatric-care";
import { trpc } from "@/lib/trpc";

function toPersistedAppointment(appointment: PediatricAppointment) {
  return {
    appointmentId: appointment.id,
    childId: appointment.childId,
    service: appointment.service,
    appointmentDate: appointment.date,
    appointmentTime: appointment.time,
    durationMinutes: appointment.durationMinutes,
    reason: appointment.reason,
    status: appointment.status,
    changeMessage: appointment.changeMessage,
    guardianConfirmedAt: appointment.guardianConfirmedAt ? new Date(appointment.guardianConfirmedAt) : undefined,
    rescheduledAt: appointment.rescheduledAt ? new Date(appointment.rescheduledAt) : undefined,
    rescheduleAcknowledgedAt: appointment.rescheduleAcknowledgedAt ? new Date(appointment.rescheduleAcknowledgedAt) : undefined,
    appointmentChangeReminderDraftedAt: appointment.appointmentChangeReminderDraftedAt ? new Date(appointment.appointmentChangeReminderDraftedAt) : undefined,
  };
}

/**
 * Hydrates the clinician-owned appointment schedule after authenticated dashboard access.
 * Parent screens never query or write this protected data directly.
 */
export function ClinicianAppointmentSync() {
  const { isAuthenticated } = useAuth();
  const { appointments, replaceAppointments } = usePediatricCare();
  const state = trpc.clinician.listDurableAppointments.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const save = trpc.clinician.saveDurableAppointments.useMutation();
  const hydrated = useRef(false);
  const lastSavedPayload = useRef("");

  useEffect(() => {
    if (!state.data || hydrated.current) return;
    if (state.data.length > 0) {
      replaceAppointments(state.data.map((appointment) => ({
        id: appointment.appointmentId,
        childId: appointment.childId,
        service: appointment.service,
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        durationMinutes: appointment.durationMinutes,
        reason: appointment.reason,
        status: appointment.status,
        changeMessage: appointment.changeMessage ?? undefined,
        guardianConfirmedAt: appointment.guardianConfirmedAt ?? undefined,
        rescheduledAt: appointment.rescheduledAt ?? undefined,
        rescheduleAcknowledgedAt: appointment.rescheduleAcknowledgedAt ?? undefined,
        appointmentChangeReminderDraftedAt: appointment.appointmentChangeReminderDraftedAt ?? undefined,
      })));
    }
    hydrated.current = true;
  }, [replaceAppointments, state.data]);

  useEffect(() => {
    if (!hydrated.current || save.isPending || appointments.length === 0) return;
    const persisted = appointments.map(toPersistedAppointment);
    const payload = JSON.stringify(persisted);
    if (payload === lastSavedPayload.current) return;
    lastSavedPayload.current = payload;
    save.mutate({ appointments: persisted }, { onError: () => { lastSavedPayload.current = ""; } });
  }, [appointments, save]);

  return null;
}
