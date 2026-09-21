-- Rescheduling a booking request and telling the parent about it.
--
-- Staff need to see how many visits are booked, how many have already moved, and
-- to move a visit to a later time while recording that the parent was told.

alter table public.booking_requests
  add column if not exists reschedule_count integer not null default 0,
  add column if not exists notified_at timestamptz,
  add column if not exists clinic_note text;

create index if not exists booking_requests_rescheduled_idx
  on public.booking_requests (reschedule_count, preferred_date);
