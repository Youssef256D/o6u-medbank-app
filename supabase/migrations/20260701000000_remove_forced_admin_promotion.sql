begin;

-- Remove the hardcoded forced-admin email promotion from the auth->profile
-- bootstrap. New signups now always default to role='student' and approved=false,
-- and the ON CONFLICT branch no longer promotes any email to admin. Existing
-- admins are NEVER demoted (the role/approved keep-existing logic is preserved),
-- and the profile auto-creation + student enrollment bootstrap are otherwise
-- byte-for-byte identical to 20260429101542_preserve_student_signup_enrollment_metadata.
--
-- Admin status is granted only via profiles.role going forward (server data).
-- This does not touch profiles that already have role='admin'.

create or replace function public.bootstrap_profile_from_auth_user_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  app_metadata jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  email_text text := lower(trim(coalesce(new.email, '')));
  full_name_text text;
  phone_text text;
  year_text text;
  semester_text text;
  year_value integer := null;
  semester_value integer := null;
  provider_text text;
begin
  full_name_text := trim(coalesce(metadata->>'full_name', ''));
  if full_name_text = '' then
    full_name_text := trim(split_part(email_text, '@', 1));
  end if;
  if full_name_text = '' then
    full_name_text := 'Student';
  end if;

  phone_text := nullif(trim(coalesce(metadata->>'phone_number', metadata->>'phone', '')), '');

  year_text := trim(coalesce(metadata->>'academic_year', metadata->>'academicYear', ''));
  if year_text ~ '^[1-5]$' then
    year_value := year_text::integer;
  end if;

  semester_text := trim(coalesce(metadata->>'academic_semester', metadata->>'academicSemester', ''));
  if semester_text ~ '^[12]$' then
    semester_value := semester_text::integer;
  end if;

  provider_text := nullif(trim(coalesce(metadata->>'auth_provider', app_metadata->>'provider', '')), '');

  insert into public.profiles (
    id,
    full_name,
    email,
    phone,
    role,
    approved,
    academic_year,
    academic_semester,
    auth_provider
  ) values (
    new.id,
    full_name_text,
    email_text,
    phone_text,
    'student'::public.app_user_role,
    false,
    year_value,
    semester_value,
    provider_text
  )
  on conflict (id) do update
  set
    full_name = case
      when coalesce(trim(public.profiles.full_name), '') = '' then excluded.full_name
      else public.profiles.full_name
    end,
    email = case
      when coalesce(trim(public.profiles.email), '') = '' then excluded.email
      else public.profiles.email
    end,
    phone = coalesce(public.profiles.phone, excluded.phone),
    -- Never demote an existing admin; never force-promote from this bootstrap.
    role = public.profiles.role,
    approved = public.profiles.approved,
    academic_year = coalesce(public.profiles.academic_year, excluded.academic_year),
    academic_semester = coalesce(public.profiles.academic_semester, excluded.academic_semester),
    auth_provider = coalesce(public.profiles.auth_provider, excluded.auth_provider);

  perform public.bootstrap_student_enrollments_from_auth_metadata(new.id, metadata);

  return new;
end;
$$;

revoke all on function public.bootstrap_profile_from_auth_user_row() from public;
revoke all on function public.bootstrap_profile_from_auth_user_row() from anon;
revoke all on function public.bootstrap_profile_from_auth_user_row() from authenticated;

commit;
