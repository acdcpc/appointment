-- Table privileges for the growth measurement table.
--
-- 0011 created the table and its policies, but PostgREST runs as service_role on
-- the server side and as authenticated for signed-in clients; both need explicit
-- table privileges in addition to RLS policies.

grant select, insert, update on public.child_growth_measurements to authenticated;
grant all on public.child_growth_measurements to service_role;
grant usage, select on sequence public.child_growth_measurements_id_seq to authenticated;
grant usage, select on sequence public.child_growth_measurements_id_seq to service_role;
