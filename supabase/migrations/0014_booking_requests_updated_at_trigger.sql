-- 0013 reused public.set_updated_at(), which writes NEW."updatedAt" (the
-- camelCase column used by the older tables). booking_requests uses
-- updated_at, so every UPDATE failed with
--   42703: record "new" has no field "updatedAt".
-- This dedicated trigger keeps the snake_case column in step.

create or replace function public.set_updated_at_snake()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_booking_requests_updated_at on public.booking_requests;
create trigger trg_booking_requests_updated_at before update on public.booking_requests
  for each row execute function public.set_updated_at_snake();
