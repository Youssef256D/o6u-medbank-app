begin;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to service_role;

create or replace function private.sync_profile_term_course_enrollments(
  target_profile_id uuid,
  assigned_by_profile_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  profile_row record;
begin
  if target_profile_id is null
     or to_regclass('public.profiles') is null
     or to_regclass('public.courses') is null
     or to_regclass('public.user_course_enrollments') is null then
    return;
  end if;

  select
    p.id,
    p.role,
    p.academic_year,
    p.academic_semester
  into profile_row
  from public.profiles p
  where p.id = target_profile_id;

  if not found then
    return;
  end if;

  if profile_row.role <> 'student'
     or profile_row.academic_year is null
     or profile_row.academic_semester is null then
    delete from public.user_course_enrollments e
    where e.user_id = profile_row.id;
    return;
  end if;

  delete from public.user_course_enrollments e
  using public.courses c
  where e.user_id = profile_row.id
    and c.id = e.course_id
    and (
      c.is_active is not true
      or c.academic_year is distinct from profile_row.academic_year
      or c.academic_semester is distinct from profile_row.academic_semester
    );

  insert into public.user_course_enrollments (
    user_id,
    course_id,
    assigned_by
  )
  select
    profile_row.id,
    c.id,
    assigned_by_profile_id
  from public.courses c
  where c.is_active is true
    and c.academic_year = profile_row.academic_year
    and c.academic_semester = profile_row.academic_semester
  on conflict (user_id, course_id) do update
  set assigned_by = coalesce(public.user_course_enrollments.assigned_by, excluded.assigned_by);
end;
$$;

revoke all on function private.sync_profile_term_course_enrollments(uuid, uuid) from public;
revoke all on function private.sync_profile_term_course_enrollments(uuid, uuid) from anon;
revoke all on function private.sync_profile_term_course_enrollments(uuid, uuid) from authenticated;
grant execute on function private.sync_profile_term_course_enrollments(uuid, uuid) to service_role;

create or replace function private.sync_profiles_for_course_term(
  target_year smallint,
  target_semester smallint
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  profile_id uuid;
begin
  if target_year is null
     or target_semester is null
     or to_regclass('public.profiles') is null then
    return;
  end if;

  for profile_id in
    select p.id
    from public.profiles p
    where p.role = 'student'
      and p.academic_year = target_year
      and p.academic_semester = target_semester
  loop
    perform private.sync_profile_term_course_enrollments(profile_id, null);
  end loop;
end;
$$;

revoke all on function private.sync_profiles_for_course_term(smallint, smallint) from public;
revoke all on function private.sync_profiles_for_course_term(smallint, smallint) from anon;
revoke all on function private.sync_profiles_for_course_term(smallint, smallint) from authenticated;

create or replace function private.handle_profile_term_enrollment_sync()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if tg_op = 'DELETE' then
    if to_regclass('public.user_course_enrollments') is not null then
      delete from public.user_course_enrollments e
      where e.user_id = old.id;
    end if;
    return old;
  end if;

  perform private.sync_profile_term_course_enrollments(new.id, null);
  return new;
end;
$$;

revoke all on function private.handle_profile_term_enrollment_sync() from public;
revoke all on function private.handle_profile_term_enrollment_sync() from anon;
revoke all on function private.handle_profile_term_enrollment_sync() from authenticated;

drop trigger if exists trg_profiles_sync_term_enrollments on public.profiles;
drop trigger if exists trg_profiles_delete_term_enrollments on public.profiles;
create trigger trg_profiles_sync_term_enrollments
after insert or update of role, academic_year, academic_semester
on public.profiles
for each row
execute function private.handle_profile_term_enrollment_sync();

create trigger trg_profiles_delete_term_enrollments
after delete
on public.profiles
for each row
execute function private.handle_profile_term_enrollment_sync();

create or replace function private.handle_course_term_enrollment_sync()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if tg_op = 'INSERT' then
    perform private.sync_profiles_for_course_term(new.academic_year, new.academic_semester);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    perform private.sync_profiles_for_course_term(new.academic_year, new.academic_semester);
    if old.academic_year is distinct from new.academic_year
       or old.academic_semester is distinct from new.academic_semester then
      perform private.sync_profiles_for_course_term(old.academic_year, old.academic_semester);
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform private.sync_profiles_for_course_term(old.academic_year, old.academic_semester);
    return old;
  end if;

  return null;
end;
$$;

revoke all on function private.handle_course_term_enrollment_sync() from public;
revoke all on function private.handle_course_term_enrollment_sync() from anon;
revoke all on function private.handle_course_term_enrollment_sync() from authenticated;

drop trigger if exists trg_courses_sync_term_enrollments on public.courses;
drop trigger if exists trg_courses_delete_term_enrollments on public.courses;
create trigger trg_courses_sync_term_enrollments
after insert or update of academic_year, academic_semester, is_active
on public.courses
for each row
execute function private.handle_course_term_enrollment_sync();

create trigger trg_courses_delete_term_enrollments
after delete
on public.courses
for each row
execute function private.handle_course_term_enrollment_sync();

do $$
declare
  profile_id uuid;
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.courses') is null
     or to_regclass('public.user_course_enrollments') is null then
    return;
  end if;

  for profile_id in
    select p.id
    from public.profiles p
  loop
    perform private.sync_profile_term_course_enrollments(profile_id, null);
  end loop;
end
$$;

commit;
