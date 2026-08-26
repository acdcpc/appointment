-- 0007_fix_appointment_upsert_returning.sql
--
-- Fix clinic_upsert_appointment: the RETURNING clause used
--   row_to_json(public.clinic_appointments)
-- A schema-qualified table name is not resolvable as a row expression in
-- RETURNING ("missing FROM-clause entry for table 'public'", 42P01). The
-- unqualified table name is the valid row reference. This latent defect from
-- migration 0003 only surfaced when the RPC was first invoked live.
--
-- Additive-only: create or replace with an otherwise identical body.

create or replace function public.clinic_upsert_appointment(
  p_clinician_user_id bigint,
  p_appointment jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row jsonb;
begin
  insert into public.clinic_appointments (
    "clinicianUserId", "appointmentId", "childId", service, "appointmentDate",
    "appointmentTime", "durationMinutes", reason, status, "changeMessage",
    "guardianConfirmedAt", "rescheduledAt", "rescheduleAcknowledgedAt",
    "appointmentChangeReminderDraftedAt"
  )
  values (
    p_clinician_user_id,
    p_appointment ->> 'appointmentId',
    p_appointment ->> 'childId',
    p_appointment ->> 'service',
    p_appointment ->> 'appointmentDate',
    p_appointment ->> 'appointmentTime',
    (p_appointment ->> 'durationMinutes')::int,
    p_appointment ->> 'reason',
    (p_appointment ->> 'status')::public.appointment_status,
    p_appointment ->> 'changeMessage',
    nullif(p_appointment ->> 'guardianConfirmedAt', '')::timestamptz,
    nullif(p_appointment ->> 'rescheduledAt', '')::timestamptz,
    nullif(p_appointment ->> 'rescheduleAcknowledgedAt', '')::timestamptz,
    nullif(p_appointment ->> 'appointmentChangeReminderDraftedAt', '')::timestamptz
  )
  on conflict ("clinicianUserId", "appointmentId") do update set
    "childId" = excluded."childId",
    service = excluded.service,
    "appointmentDate" = excluded."appointmentDate",
    "appointmentTime" = excluded."appointmentTime",
    "durationMinutes" = excluded."durationMinutes",
    reason = excluded.reason,
    status = excluded.status,
    "changeMessage" = excluded."changeMessage",
    "guardianConfirmedAt" = excluded."guardianConfirmedAt",
    "rescheduledAt" = excluded."rescheduledAt",
    "rescheduleAcknowledgedAt" = excluded."rescheduleAcknowledgedAt",
    "appointmentChangeReminderDraftedAt" = excluded."appointmentChangeReminderDraftedAt"
  returning row_to_json(clinic_appointments) into v_row;
  return v_row;
end;
$$;
