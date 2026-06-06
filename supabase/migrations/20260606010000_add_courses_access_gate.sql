begin;

alter table public.profiles
add column if not exists courses_access_enabled boolean not null default true;

create index if not exists idx_profiles_role_courses_access
on public.profiles(role, courses_access_enabled);

create or replace function private.can_current_user_access_courses()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and (
        (p.role = 'admin' and p.approved is true)
        or (p.role = 'student' and p.courses_access_enabled is true)
      )
  );
$$;

revoke all on function private.can_current_user_access_courses() from public;
revoke all on function private.can_current_user_access_courses() from anon;
grant execute on function private.can_current_user_access_courses() to authenticated;
grant execute on function private.can_current_user_access_courses() to service_role;

drop policy if exists profiles_update_self on public.profiles;
drop function if exists private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint);
drop function if exists private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint, boolean);

create or replace function private.can_update_own_profile(
  target_id uuid,
  target_role public.app_user_role,
  target_approved boolean,
  target_year smallint,
  target_semester smallint,
  target_mcq_access_enabled boolean,
  target_courses_access_enabled boolean
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.id = target_id
      and p.role = target_role
      and p.approved is not distinct from target_approved
      and p.mcq_access_enabled is not distinct from target_mcq_access_enabled
      and p.courses_access_enabled is not distinct from target_courses_access_enabled
      and (
        p.approved is not true
        or (
          p.academic_year is not distinct from target_year
          and p.academic_semester is not distinct from target_semester
        )
      )
  );
$$;

revoke all on function private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint, boolean, boolean) from public;
revoke all on function private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint, boolean, boolean) from anon;
grant execute on function private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint, boolean, boolean) to authenticated;
grant execute on function private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint, boolean, boolean) to service_role;

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  and role = 'student'
)
with check (
  private.can_update_own_profile(id, role, approved, academic_year, academic_semester, mcq_access_enabled, courses_access_enabled)
);

create or replace function private.platform_suggestion_matches_current_profile(
  target_year integer,
  target_semester integer
)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'student'
      and p.courses_access_enabled is true
      and (
        (target_year is null and target_semester is null)
        or (target_year = p.academic_year and target_semester is null)
        or (target_year = p.academic_year and target_semester = p.academic_semester)
      )
  );
$$;

create or replace function private.can_select_platform_course(
  target_course_id uuid,
  target_enrollment_mode text,
  target_is_active boolean,
  target_is_published boolean
)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select not private.is_app_feature_enabled('courses_coming_soon')
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'student'
        and p.courses_access_enabled is true
        and target_is_active is true
        and target_is_published is true
        and (
          exists (
            select 1
            from public.platform_course_enrollments e
            where e.user_id = p.id
              and e.course_id = target_course_id
          )
          or exists (
            select 1
            from public.platform_course_suggestions s
            where s.course_id = target_course_id
              and s.is_active is true
              and (s.starts_at is null or s.starts_at <= now())
              and (s.ends_at is null or s.ends_at >= now())
              and (
                (s.target_academic_year is null and s.target_semester is null)
                or (s.target_academic_year = p.academic_year and s.target_semester is null)
                or (s.target_academic_year = p.academic_year and s.target_semester = p.academic_semester)
              )
          )
        )
    );
$$;

create or replace function private.can_select_platform_course_by_id(target_course_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select not private.is_app_feature_enabled('courses_coming_soon')
    and exists (
      select 1
      from public.platform_courses c
      where c.id = target_course_id
        and private.can_select_platform_course(c.id, c.enrollment_mode, c.is_active, c.is_published)
    );
$$;

create or replace function private.is_platform_course_requestable_for_current_student(target_course_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select not private.is_app_feature_enabled('courses_coming_soon')
    and exists (
      select 1
      from public.platform_courses c
      join public.profiles p on p.id = (select auth.uid())
      where c.id = target_course_id
        and c.is_active is true
        and c.is_published is true
        and p.role = 'student'
        and p.courses_access_enabled is true
        and private.can_select_platform_course_by_id(c.id)
    );
$$;

grant execute on function private.platform_suggestion_matches_current_profile(integer, integer) to authenticated;
grant execute on function private.can_select_platform_course(uuid, text, boolean, boolean) to authenticated;
grant execute on function private.can_select_platform_course_by_id(uuid) to authenticated;
grant execute on function private.is_platform_course_requestable_for_current_student(uuid) to authenticated;

drop policy if exists platform_enrollments_select_own on public.platform_course_enrollments;
create policy platform_enrollments_select_own
on public.platform_course_enrollments
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.can_current_user_access_courses()
  and not private.is_app_feature_enabled('courses_coming_soon')
);

drop policy if exists platform_progress_select_own on public.platform_lesson_progress;
create policy platform_progress_select_own
on public.platform_lesson_progress
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.can_current_user_access_courses()
  and not private.is_app_feature_enabled('courses_coming_soon')
);

drop policy if exists platform_progress_insert_own on public.platform_lesson_progress;
create policy platform_progress_insert_own
on public.platform_lesson_progress
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_select_platform_course_by_id(course_id)
);

drop policy if exists platform_progress_update_own on public.platform_lesson_progress;
create policy platform_progress_update_own
on public.platform_lesson_progress
for update
to authenticated
using (
  user_id = (select auth.uid())
  and private.can_current_user_access_courses()
  and not private.is_app_feature_enabled('courses_coming_soon')
)
with check (
  user_id = (select auth.uid())
  and private.can_select_platform_course_by_id(course_id)
);

drop policy if exists platform_requests_select_own on public.platform_course_enrollment_requests;
create policy platform_requests_select_own
on public.platform_course_enrollment_requests
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.can_current_user_access_courses()
  and not private.is_app_feature_enabled('courses_coming_soon')
);

drop policy if exists platform_requests_insert_own on public.platform_course_enrollment_requests;
create policy platform_requests_insert_own
on public.platform_course_enrollment_requests
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and private.is_platform_course_requestable_for_current_student(course_id)
);

notify pgrst, 'reload schema';

commit;
