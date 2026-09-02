-- 0009_staff_guardian_linking.sql
--
-- Service-role helpers for the clinic staff "Link guardian to child" workflow.
-- Both functions are SECURITY DEFINER and locked down to service_role only —
-- they expose auth.users emails, so they must never be callable by clients.

create or replace function public.find_auth_user_by_email(p_email text)
returns table (id uuid, email text)
language sql stable security definer set search_path to public as $$
  select u.id, u.email::text from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;
revoke all on function public.find_auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.find_auth_user_by_email(text) to service_role;

create or replace function public.list_guardian_links()
returns table (link_id bigint, auth_user_id uuid, email text, child_id text, full_name text, relationship text, verified boolean, verified_at timestamptz)
language sql stable security definer set search_path to public as $$
  select g.id, g.auth_user_id, u.email::text, g.child_id, g.full_name, g.relationship,
         (g.verified_at is not null), g.verified_at
  from public.guardians g left join auth.users u on u.id = g.auth_user_id
  order by g.id desc;
$$;
revoke all on function public.list_guardian_links() from public, anon, authenticated;
grant execute on function public.list_guardian_links() to service_role;
