begin;

-- Student signup can happen before the browser has a durable Supabase
-- session, especially when email confirmation is enabled. Keep the auth
-- bootstrap as a fallback for user-entered enrollment details, but only fill
-- missing profile/enrollment fields and never grant approval from metadata.

alter table public.profiles
  add column if not exists auth_provider text;

create or replace function public.bootstrap_student_enrollments_from_auth_metadata(
  target_user_id uuid,
  metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_metadata jsonb := coalesce(metadata, '{}'::jsonb);
  selected_courses jsonb := coalesce(
    normalized_metadata -> 'assigned_courses',
    normalized_metadata -> 'assignedCourses',
    '[]'::jsonb
  );
  selected_course_names text[] := null;
  year_text text := trim(coalesce(normalized_metadata ->> 'academic_year', normalized_metadata ->> 'academicYear', ''));
  semester_text text := trim(coalesce(normalized_metadata ->> 'academic_semester', normalized_metadata ->> 'academicSemester', ''));
  year_value integer := null;
  semester_value integer := null;
  inserted_count integer := 0;
begin
  if target_user_id is null
    or to_regclass('public.user_course_enrollments') is null
    or to_regclass('public.courses') is null then
    return;
  end if;

  if year_text ~ '^[1-5]$' then
    year_value := year_text::integer;
  end if;

  if semester_text ~ '^[12]$' then
    semester_value := semester_text::integer;
  end if;

  if year_value is null or semester_value is null then
    return;
  end if;

  if exists (
    select 1
    from public.user_course_enrollments existing
    where existing.user_id = target_user_id
  ) then
    return;
  end if;

  if jsonb_typeof(selected_courses) = 'array' then
    select array_agg(distinct nullif(trim(course_name), ''))
    into selected_course_names
    from jsonb_array_elements_text(selected_courses) as course_name;
  end if;

  if coalesce(array_length(selected_course_names, 1), 0) > 0 then
    insert into public.user_course_enrollments (user_id, course_id, assigned_by)
    select target_user_id, c.id, null
    from public.courses c
    where c.is_active is not false
      and c.academic_year = year_value
      and c.academic_semester = semester_value
      and c.course_name = any(selected_course_names)
    on conflict (user_id, course_id) do nothing;

    get diagnostics inserted_count = row_count;
  end if;

  if inserted_count = 0 then
    insert into public.user_course_enrollments (user_id, course_id, assigned_by)
    select target_user_id, c.id, null
    from public.courses c
    where c.is_active is not false
      and c.academic_year = year_value
      and c.academic_semester = semester_value
    on conflict (user_id, course_id) do nothing;
  end if;
end;
$$;

revoke all on function public.bootstrap_student_enrollments_from_auth_metadata(uuid, jsonb) from public;

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
  forced_admin boolean := false;
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
  forced_admin := email_text in (
    'code.youssefaayoub@gmail.com',
    'code.youssefayoub@gmail.com'
  );

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
    case when forced_admin then 'admin'::public.app_user_role else 'student'::public.app_user_role end,
    case when forced_admin then true else false end,
    case when forced_admin then null else year_value end,
    case when forced_admin then null else semester_value end,
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
    role = case
      when public.profiles.role = 'admin' then public.profiles.role
      when excluded.role = 'admin' then excluded.role
      else public.profiles.role
    end,
    approved = case
      when public.profiles.approved then true
      when excluded.role = 'admin' then true
      else public.profiles.approved
    end,
    academic_year = coalesce(public.profiles.academic_year, excluded.academic_year),
    academic_semester = coalesce(public.profiles.academic_semester, excluded.academic_semester),
    auth_provider = coalesce(public.profiles.auth_provider, excluded.auth_provider);

  if not forced_admin then
    perform public.bootstrap_student_enrollments_from_auth_metadata(new.id, metadata);
  end if;

  return new;
end;
$$;

revoke all on function public.bootstrap_profile_from_auth_user_row() from public;

drop trigger if exists on_auth_user_created_sync_profile on auth.users;
drop trigger if exists trg_auth_users_create_profile on auth.users;

create trigger trg_auth_users_create_profile
after insert or update of raw_user_meta_data, raw_app_meta_data, email on auth.users
for each row execute function public.bootstrap_profile_from_auth_user_row();

with auth_source as (
  select
    u.id,
    lower(trim(coalesce(u.email, ''))) as email_text,
    coalesce(u.raw_user_meta_data, '{}'::jsonb) as metadata,
    coalesce(u.raw_app_meta_data, '{}'::jsonb) as app_metadata
  from auth.users u
),
normalized as (
  select
    id,
    email_text,
    nullif(trim(coalesce(metadata->>'phone_number', metadata->>'phone', '')), '') as phone_text,
    case
      when trim(coalesce(metadata->>'academic_year', metadata->>'academicYear', '')) ~ '^[1-5]$'
        then trim(coalesce(metadata->>'academic_year', metadata->>'academicYear', ''))::integer
      else null
    end as year_value,
    case
      when trim(coalesce(metadata->>'academic_semester', metadata->>'academicSemester', '')) ~ '^[12]$'
        then trim(coalesce(metadata->>'academic_semester', metadata->>'academicSemester', ''))::integer
      else null
    end as semester_value,
    nullif(trim(coalesce(metadata->>'auth_provider', app_metadata->>'provider', '')), '') as provider_text
  from auth_source
)
update public.profiles p
set
  phone = coalesce(p.phone, n.phone_text),
  academic_year = coalesce(p.academic_year, n.year_value),
  academic_semester = coalesce(p.academic_semester, n.semester_value),
  auth_provider = coalesce(p.auth_provider, n.provider_text)
from normalized n
where p.id = n.id
  and p.role = 'student'
  and (
    (p.phone is null and n.phone_text is not null)
    or (p.academic_year is null and n.year_value is not null)
    or (p.academic_semester is null and n.semester_value is not null)
    or (p.auth_provider is null and n.provider_text is not null)
  );

do $$
begin
  if to_regclass('public.user_course_enrollments') is not null
    and to_regclass('public.courses') is not null then
    execute $sql$
      with normalized as (
        select
          u.id,
          case
            when trim(coalesce(u.raw_user_meta_data->>'academic_year', u.raw_user_meta_data->>'academicYear', '')) ~ '^[1-5]$'
              then trim(coalesce(u.raw_user_meta_data->>'academic_year', u.raw_user_meta_data->>'academicYear', ''))::integer
            else null
          end as year_value,
          case
            when trim(coalesce(u.raw_user_meta_data->>'academic_semester', u.raw_user_meta_data->>'academicSemester', '')) ~ '^[12]$'
              then trim(coalesce(u.raw_user_meta_data->>'academic_semester', u.raw_user_meta_data->>'academicSemester', ''))::integer
            else null
          end as semester_value,
          case
            when jsonb_typeof(coalesce(u.raw_user_meta_data -> 'assigned_courses', u.raw_user_meta_data -> 'assignedCourses')) = 'array'
              then array(
                select distinct nullif(trim(course_name), '')
                from jsonb_array_elements_text(coalesce(u.raw_user_meta_data -> 'assigned_courses', u.raw_user_meta_data -> 'assignedCourses')) as course_name
              )
            else null::text[]
          end as selected_course_names
        from auth.users u
      )
      insert into public.user_course_enrollments (user_id, course_id, assigned_by)
      select n.id, c.id, null
      from normalized n
      join public.profiles p on p.id = n.id and p.role = 'student'
      join public.courses c
        on c.is_active is not false
       and c.academic_year = n.year_value
       and c.academic_semester = n.semester_value
       and c.course_name = any(n.selected_course_names)
      where n.year_value is not null
        and n.semester_value is not null
        and coalesce(array_length(n.selected_course_names, 1), 0) > 0
        and not exists (
          select 1
          from public.user_course_enrollments existing
          where existing.user_id = n.id
        )
      on conflict (user_id, course_id) do nothing
    $sql$;

    execute $sql$
      with normalized as (
        select
          u.id,
          case
            when trim(coalesce(u.raw_user_meta_data->>'academic_year', u.raw_user_meta_data->>'academicYear', '')) ~ '^[1-5]$'
              then trim(coalesce(u.raw_user_meta_data->>'academic_year', u.raw_user_meta_data->>'academicYear', ''))::integer
            else null
          end as year_value,
          case
            when trim(coalesce(u.raw_user_meta_data->>'academic_semester', u.raw_user_meta_data->>'academicSemester', '')) ~ '^[12]$'
              then trim(coalesce(u.raw_user_meta_data->>'academic_semester', u.raw_user_meta_data->>'academicSemester', ''))::integer
            else null
          end as semester_value
        from auth.users u
      )
      insert into public.user_course_enrollments (user_id, course_id, assigned_by)
      select n.id, c.id, null
      from normalized n
      join public.profiles p on p.id = n.id and p.role = 'student'
      join public.courses c
        on c.is_active is not false
       and c.academic_year = n.year_value
       and c.academic_semester = n.semester_value
      where n.year_value is not null
        and n.semester_value is not null
        and not exists (
          select 1
          from public.user_course_enrollments existing
          where existing.user_id = n.id
        )
      on conflict (user_id, course_id) do nothing
    $sql$;
  end if;
end
$$;

commit;
