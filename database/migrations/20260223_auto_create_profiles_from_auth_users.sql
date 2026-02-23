-- Applied migration name: auto_create_profiles_from_auth_users
-- Ensure every auth.users signup has a matching public.profiles row.

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

  return new;
end;
$$;

drop trigger if exists trg_auth_users_create_profile on auth.users;
create trigger trg_auth_users_create_profile
after insert on auth.users
for each row execute function public.bootstrap_profile_from_auth_user_row();

with missing_profile_rows as (
  select
    u.id,
    lower(trim(coalesce(u.email, ''))) as email_text,
    coalesce(u.raw_user_meta_data, '{}'::jsonb) as metadata,
    coalesce(u.raw_app_meta_data, '{}'::jsonb) as app_metadata
  from auth.users u
  left join public.profiles p
    on p.id = u.id
  where p.id is null
),
normalized as (
  select
    id,
    email_text,
    case
      when trim(coalesce(metadata->>'full_name', '')) <> '' then trim(metadata->>'full_name')
      when trim(split_part(email_text, '@', 1)) <> '' then trim(split_part(email_text, '@', 1))
      else 'Student'
    end as full_name_text,
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
    nullif(trim(coalesce(metadata->>'auth_provider', app_metadata->>'provider', '')), '') as provider_text,
    (email_text in ('code.youssefaayoub@gmail.com', 'code.youssefayoub@gmail.com')) as forced_admin
  from missing_profile_rows
)
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
)
select
  id,
  full_name_text,
  email_text,
  phone_text,
  case when forced_admin then 'admin'::public.app_user_role else 'student'::public.app_user_role end,
  case when forced_admin then true else false end,
  case when forced_admin then null else year_value end,
  case when forced_admin then null else semester_value end,
  provider_text
from normalized
on conflict (id) do nothing;
