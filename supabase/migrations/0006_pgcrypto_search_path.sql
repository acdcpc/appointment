-- Supabase installs pgcrypto into the "extensions" schema. The guardian
-- challenge RPCs use gen_random_bytes/digest, so their search_path must
-- include extensions (previously only public, which resolved to nothing).

create or replace function public.issue_guardian_record_access_challenge(
  p_clinician_user_id bigint,
  p_child_id text,
  p_issued_by text,
  p_expiry_hours int,
  p_attempt_limit int
) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_reference text := upper(encode(gen_random_bytes(6), 'hex'));
  v_code text := lpad(floor(random() * 1000000)::int::text, 6, '0');
  v_expires timestamptz := now() + make_interval(hours => p_expiry_hours);
begin
  insert into public.guardian_record_access_challenges (
    "clinicianUserId", "challengeId", "childId", "referenceHash",
    "verificationCodeHash", "attemptCount", "issuedBy", "expiresAt"
  ) values (
    p_clinician_user_id,
    'guardian-record-' || floor(extract(epoch from now()) * 1000)::bigint || '-' || v_reference,
    p_child_id,
    encode(digest(v_reference, 'sha256'), 'hex'),
    encode(digest(v_code, 'sha256'), 'hex'),
    0,
    p_issued_by,
    v_expires
  );
  return jsonb_build_object('reference', v_reference, 'verificationCode', v_code, 'expiresAt', v_expires::text, 'attemptLimit', p_attempt_limit);
end;
$$;

create or replace function public.verify_guardian_record_access(
  p_reference text,
  p_verification_code text,
  p_attempt_limit int,
  p_access_hours int
) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_challenge public.guardian_record_access_challenges%rowtype;
  v_token text;
  v_expires timestamptz;
begin
  select * into v_challenge from public.guardian_record_access_challenges
    where "referenceHash" = encode(digest(upper(trim(p_reference)), 'sha256'), 'hex')
    for update;
  if v_challenge.id is null then return null; end if;
  if v_challenge."revokedAt" is not null or v_challenge."verifiedAt" is not null
     or v_challenge."expiresAt" <= now()
     or v_challenge."attemptCount" >= p_attempt_limit then
    return null;
  end if;
  if v_challenge."verificationCodeHash" <> encode(digest(trim(p_verification_code), 'sha256'), 'hex') then
    update public.guardian_record_access_challenges
      set "attemptCount" = v_challenge."attemptCount" + 1,
          "revokedAt" = case when v_challenge."attemptCount" + 1 >= p_attempt_limit then now() else null end
      where id = v_challenge.id;
    return null;
  end if;
  v_token := encode(gen_random_bytes(32), 'base64');
  v_expires := now() + make_interval(hours => p_access_hours);
  update public.guardian_record_access_challenges
    set "verifiedAt" = now(), "accessTokenHash" = encode(digest(v_token, 'sha256'), 'hex'),
        "accessExpiresAt" = v_expires
    where id = v_challenge.id;
  return jsonb_build_object('accessToken', v_token, 'childId', v_challenge."childId", 'accessExpiresAt', v_expires::text);
end;
$$;

grant execute on function public.issue_guardian_record_access_challenge(bigint, text, text, int, int) to authenticated, service_role;
grant execute on function public.verify_guardian_record_access(text, text, int, int) to authenticated, service_role;
