-- Fix RLS helper recursion: is_clinic_admin() queries public.users, whose RLS
-- policy (users_own_read/users_own_update) calls back into the helper. Marking
-- the helpers SECURITY DEFINER lets them run as the owner (bypassing RLS) so
-- policy evaluation terminates. They only return booleans / the JWT email —
-- no data is exposed by this.
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.jwt()->>'email' = 'thisispratha@gmail.com';
$$;

create or replace function public.is_clinic_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.jwt()->>'email' = 'anilrajojha@pahs.edu.np'
      or exists (
        select 1 from public.users u
        where u.email = auth.jwt()->>'email'
          and u.role = 'admin'
      );
$$;

create or replace function public.is_trusted_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin() or public.is_clinic_admin();
$$;

create or replace function public.current_profile_email()
returns text language sql stable security definer set search_path = public as $$
  select nullif(auth.jwt()->>'email', '')::text;
$$;
