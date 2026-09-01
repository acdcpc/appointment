-- 0008_clinic_children.sql
--
-- Server-scoped child records. Replaces the prototype's in-memory/localStorage
-- demo children for signed-in guardians: child profiles live in
-- public.clinic_children and are scoped by RLS through the existing
-- guardians link table (guardian_child_ids() = verified childIds of auth.uid()).
--
-- Column-level grants keep guardian updates limited to name/allergies;
-- clinicians (service role) retain full control.

create table public.clinic_children (
  id bigint generated always as identity primary key,
  "childId" text not null unique,
  "name" text not null default '',
  "dateOfBirth" text,
  "sex" text check ("sex" in ('male', 'female')),
  "allergies" text not null default '',
  "parentName" text,
  "createdBy" bigint,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table public.clinic_children enable row level security;

-- Reads: clinic administrators, or guardians with a verified link to the child.
create policy clinic_children_admin_read on public.clinic_children
  for select to public using (public.is_trusted_admin());
create policy clinic_children_guardian_read on public.clinic_children
  for select to public using (("childId")::text in (select public.guardian_child_ids()));

-- Updates: administrators, or guardians for their own linked children.
create policy clinic_children_admin_update on public.clinic_children
  for update to public using (public.is_trusted_admin()) with check (public.is_trusted_admin());
create policy clinic_children_guardian_update on public.clinic_children
  for update to authenticated
  using (("childId")::text in (select public.guardian_child_ids()))
  with check (("childId")::text in (select public.guardian_child_ids()));

-- Inserts/deletes stay clinician-provisioned (service role / trusted admin).
create policy clinic_children_admin_insert on public.clinic_children
  for insert to public with check (public.is_trusted_admin());
create policy clinic_children_admin_delete on public.clinic_children
  for delete to public using (public.is_trusted_admin());

grant select, update ("name", "allergies", "updatedAt") on public.clinic_children to authenticated;
grant all on public.clinic_children to service_role;

-- Seed the three prototype children so existing guardian links resolve.
insert into public.clinic_children ("childId", "name", "dateOfBirth", "sex", "allergies", "parentName")
values
  ('child-1', 'Aarav Smith', '14 May 2022', 'male', 'No known drug allergies reported', 'Jordan Smith'),
  ('child-2', 'Maya Gurung', '03 September 2020', 'female', 'Parent reports no known allergies', 'Nisha Gurung'),
  ('child-3', 'Rohan Thapa', '21 January 2019', 'male', 'See parent-provided allergy history', 'Suman Thapa')
on conflict ("childId") do nothing;
