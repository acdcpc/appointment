-- Parents record the child's date of birth on the booking request, in either
-- the English (A.D.) calendar or the Nepali Bikram Sambat (B.S.) calendar.
--
-- Both texts are stored the way they are read: the English one
-- ("14 May 2022") is the canonical value the app's own age maths uses, and the
-- Bikram Sambat one ("31 Baisakh 2079") is kept alongside it because parents
-- and clinic staff in Nepal read that form directly. Nullable: a parent who
-- does not know the date of birth enters the age only.
alter table public.booking_requests add column if not exists child_dob text;
alter table public.booking_requests add column if not exists child_dob_bs text;
