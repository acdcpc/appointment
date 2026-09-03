-- 0010_guardian_account_deletion.sql
--
-- Parents can delete their own account from Profile. The deletion is
-- destructive on the parent side (guardians link + child records + auth user)
-- but a full snapshot is retained in guardian_account_deletions, visible only
-- to the super-admin for audit/recovery.

create table public.guardian_account_deletions (
  id bigint generated always as identity primary key,
  auth_user_id uuid not null,
  email text not null,
  child_ids text[] not null default '{}',
  snapshot jsonb not null default '{}'::jsonb,
  deleted_at timestamptz not null default now()
);

alter table public.guardian_account_deletions enable row level security;
-- No client policies: reads/writes happen through the service role only.

create or replace function public.delete_own_guardian_account()
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_child_ids text[];
  v_snapshot jsonb;
begin
  if v_user is null then
    raise exception 'Not signed in';
  end if;
  select email into v_email from auth.users where id = v_user;
  select coalesce(array_agg(child_id), '{}') into v_child_ids
    from guardians where auth_user_id = v_user;
  select jsonb_build_object(
    'guardians', coalesce((select jsonb_agg(to_jsonb(g)) from guardians g where g.auth_user_id = v_user), '[]'::jsonb),
    'children', coalesce((select jsonb_agg(to_jsonb(c)) from clinic_children c where c."childId" = any(v_child_ids)), '[]'::jsonb)
  ) into v_snapshot;
  insert into guardian_account_deletions (auth_user_id, email, child_ids, snapshot)
    values (v_user, coalesce(v_email, ''), v_child_ids, v_snapshot);
  delete from guardians where auth_user_id = v_user;
  delete from clinic_children where "childId" = any(v_child_ids);
  delete from auth.users where id = v_user;
  return jsonb_build_object('ok', true, 'email', coalesce(v_email, ''), 'childIds', to_jsonb(v_child_ids));
end;
$$;
revoke all on function public.delete_own_guardian_account() from public, anon;
grant execute on function public.delete_own_guardian_account() to authenticated;
