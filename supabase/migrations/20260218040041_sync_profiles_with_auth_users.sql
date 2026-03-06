create or replace function public.sync_profile_from_auth_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  auth_email text;
  normalized_email text;
  full_name text;
  auth_created_at timestamptz;
  is_forced_admin boolean;
begin
  if target_user_id is null then
    return;
  end if;

  select
    u.email,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), '')
    ),
    u.created_at
  into auth_email, full_name, auth_created_at
  from auth.users u
  where u.id = target_user_id;

  if auth_email is null then
    return;
  end if;

  normalized_email := lower(trim(auth_email));
  if normalized_email = '' then
    return;
  end if;

  if full_name is null or full_name = '' then
    full_name := split_part(normalized_email, '@', 1);
  end if;
  if full_name is null or full_name = '' then
    full_name := 'Student';
  end if;

  is_forced_admin := normalized_email in ('code.youssefaayoub@gmail.com', 'code.youssefayoub@gmail.com');

  insert into public.profiles (
    id,
    full_name,
    email,
    phone,
    role,
    approved,
    academic_year,
    academic_semester,
    created_at,
    updated_at
  )
  values (
    target_user_id,
    full_name,
    normalized_email,
    null,
    case when is_forced_admin then 'admin'::app_user_role else 'student'::app_user_role end,
    case when is_forced_admin then true else false end,
    null,
    null,
    coalesce(auth_created_at, now()),
    now()
  )
  on conflict do nothing;
end;
$$;

revoke all on function public.sync_profile_from_auth_user(uuid) from public;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.sync_profile_from_auth_user(new.id);
  return new;
end;
$$;

revoke all on function public.handle_auth_user_created() from public;

drop trigger if exists on_auth_user_created_sync_profile on auth.users;

create trigger on_auth_user_created_sync_profile
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

insert into public.profiles (
  id,
  full_name,
  email,
  phone,
  role,
  approved,
  academic_year,
  academic_semester,
  created_at,
  updated_at
)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    split_part(lower(trim(u.email)), '@', 1),
    'Student'
  ) as full_name,
  lower(trim(u.email)) as email,
  null as phone,
  case
    when lower(trim(u.email)) in ('code.youssefaayoub@gmail.com', 'code.youssefayoub@gmail.com')
      then 'admin'::app_user_role
    else 'student'::app_user_role
  end as role,
  case
    when lower(trim(u.email)) in ('code.youssefaayoub@gmail.com', 'code.youssefayoub@gmail.com')
      then true
    else false
  end as approved,
  null as academic_year,
  null as academic_semester,
  coalesce(u.created_at, now()) as created_at,
  now() as updated_at
from auth.users u
left join public.profiles p
  on p.id = u.id
where p.id is null
  and u.email is not null
  and btrim(u.email) <> ''
on conflict do nothing;;
