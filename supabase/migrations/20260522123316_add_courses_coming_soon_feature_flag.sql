begin;

create table if not exists public.app_feature_flags (
  feature_key text primary key,
  enabled boolean not null default false,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

drop trigger if exists trg_app_feature_flags_updated_at on public.app_feature_flags;
create trigger trg_app_feature_flags_updated_at
before update on public.app_feature_flags
for each row
execute function public.set_updated_at();

insert into public.app_feature_flags (feature_key, enabled, description)
values (
  'courses_coming_soon',
  false,
  'When enabled, students see Coming soon instead of the Courses learning portal.'
)
on conflict (feature_key) do nothing;

create or replace function private.is_app_feature_enabled(target_feature_key text)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select coalesce((
    select enabled
    from public.app_feature_flags
    where feature_key = target_feature_key
    limit 1
  ), false);
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
      where p.id = auth.uid()
        and p.role = 'student'
        and p.approved is true
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
      join public.profiles p on p.id = auth.uid()
      where c.id = target_course_id
        and c.is_active is true
        and c.is_published is true
        and p.role = 'student'
        and p.approved is true
        and private.can_select_platform_course_by_id(c.id)
    );
$$;

grant execute on function private.is_app_feature_enabled(text) to authenticated;
grant execute on function private.can_select_platform_course(uuid, text, boolean, boolean) to authenticated;
grant execute on function private.can_select_platform_course_by_id(uuid) to authenticated;
grant execute on function private.is_platform_course_requestable_for_current_student(uuid) to authenticated;

grant select, insert, update, delete on public.app_feature_flags to authenticated;

alter table public.app_feature_flags enable row level security;

drop policy if exists app_feature_flags_select_admin on public.app_feature_flags;
drop policy if exists app_feature_flags_select_public_courses_flag on public.app_feature_flags;
drop policy if exists app_feature_flags_insert_admin on public.app_feature_flags;
drop policy if exists app_feature_flags_update_admin on public.app_feature_flags;
drop policy if exists app_feature_flags_delete_admin on public.app_feature_flags;

create policy app_feature_flags_select_admin
on public.app_feature_flags
for select
to authenticated
using ((select private.is_admin_user()));

create policy app_feature_flags_select_public_courses_flag
on public.app_feature_flags
for select
to authenticated
using (feature_key = 'courses_coming_soon');

create policy app_feature_flags_insert_admin
on public.app_feature_flags
for insert
to authenticated
with check ((select private.is_admin_user()));

create policy app_feature_flags_update_admin
on public.app_feature_flags
for update
to authenticated
using ((select private.is_admin_user()))
with check ((select private.is_admin_user()));

create policy app_feature_flags_delete_admin
on public.app_feature_flags
for delete
to authenticated
using ((select private.is_admin_user()));

drop policy if exists platform_enrollments_select_own on public.platform_course_enrollments;
create policy platform_enrollments_select_own
on public.platform_course_enrollments
for select
to authenticated
using (
  user_id = (select auth.uid())
  and not private.is_app_feature_enabled('courses_coming_soon')
);

drop policy if exists platform_progress_select_own on public.platform_lesson_progress;
create policy platform_progress_select_own
on public.platform_lesson_progress
for select
to authenticated
using (
  user_id = (select auth.uid())
  and not private.is_app_feature_enabled('courses_coming_soon')
);

drop policy if exists platform_progress_update_own on public.platform_lesson_progress;
create policy platform_progress_update_own
on public.platform_lesson_progress
for update
to authenticated
using (
  user_id = (select auth.uid())
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
  and not private.is_app_feature_enabled('courses_coming_soon')
);

commit;
