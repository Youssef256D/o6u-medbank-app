begin;

create extension if not exists pgcrypto;

drop policy if exists courses_select_student_open_or_request_published on public.courses;
drop policy if exists courses_select_student_open_published on public.courses;
drop policy if exists enrollments_insert_student_open_course on public.user_course_enrollments;

drop table if exists public.course_suggestions cascade;
drop table if exists public.course_enrollment_requests cascade;
drop table if exists public.student_lesson_progress cascade;
drop table if exists public.course_resources cascade;
drop table if exists public.course_lessons cascade;
drop table if exists public.course_modules cascade;
drop table if exists public.course_announcements cascade;

drop index if exists public.idx_courses_published_enrollment;

alter table if exists public.courses
  drop constraint if exists courses_enrollment_mode_ck,
  drop constraint if exists courses_course_type_ck,
  drop column if exists description,
  drop column if exists cover_image_url,
  drop column if exists intro_video_url,
  drop column if exists instructor_name,
  drop column if exists instructor_bio,
  drop column if exists level,
  drop column if exists estimated_duration,
  drop column if exists is_published,
  drop column if exists enrollment_mode,
  drop column if exists price,
  drop column if exists course_type;

create table if not exists public.platform_courses (
  id uuid primary key default gen_random_uuid(),
  course_code text,
  course_name text not null,
  academic_year smallint not null check (academic_year between 1 and 5),
  academic_semester smallint not null check (academic_semester in (1,2)),
  description text,
  cover_image_url text,
  intro_video_url text,
  instructor_name text,
  instructor_bio text,
  level text,
  estimated_duration text,
  is_active boolean not null default true,
  is_published boolean not null default false,
  enrollment_mode text not null default 'request' check (enrollment_mode in ('assigned', 'request')),
  price numeric not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_courses_name_term_uniq unique (course_name, academic_year, academic_semester)
);

create table if not exists public.platform_course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.platform_courses(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.platform_courses(id) on delete cascade,
  module_id uuid not null references public.platform_course_modules(id) on delete cascade,
  title text not null,
  description text,
  lesson_type text not null default 'video',
  video_url text,
  video_provider text,
  duration_seconds integer,
  content_html text,
  position integer not null default 0,
  is_free_preview boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_course_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.platform_courses(id) on delete cascade,
  module_id uuid references public.platform_course_modules(id) on delete set null,
  lesson_id uuid references public.platform_course_lessons(id) on delete cascade,
  title text not null,
  resource_type text not null default 'file',
  file_url text,
  external_url text,
  description text,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_course_enrollments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.platform_courses(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists public.platform_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.platform_courses(id) on delete cascade,
  lesson_id uuid not null references public.platform_course_lessons(id) on delete cascade,
  status text not null default 'not_started',
  progress_percent integer not null default 0,
  watched_seconds integer not null default 0,
  completed_at timestamptz,
  last_opened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

create table if not exists public.platform_course_announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.platform_courses(id) on delete cascade,
  title text not null,
  body text not null,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_course_enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.platform_courses(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, course_id)
);

create table if not exists public.platform_course_suggestions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.platform_courses(id) on delete cascade,
  target_academic_year integer null check (target_academic_year is null or target_academic_year between 1 and 5),
  target_semester integer null check (target_semester is null or target_semester in (1,2)),
  title text,
  reason text,
  priority integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_courses_term on public.platform_courses(academic_year, academic_semester);
create index if not exists idx_platform_courses_published on public.platform_courses(is_active, is_published, enrollment_mode);
create index if not exists idx_platform_course_modules_course_position on public.platform_course_modules(course_id, position);
create index if not exists idx_platform_course_lessons_course_module_position on public.platform_course_lessons(course_id, module_id, position);
create index if not exists idx_platform_course_resources_lesson_position on public.platform_course_resources(lesson_id, position);
create index if not exists idx_platform_course_enrollments_course on public.platform_course_enrollments(course_id);
create index if not exists idx_platform_lesson_progress_user_course on public.platform_lesson_progress(user_id, course_id);
create index if not exists idx_platform_course_announcements_course_created on public.platform_course_announcements(course_id, created_at desc);
create index if not exists idx_platform_course_requests_course_status on public.platform_course_enrollment_requests(course_id, status);
create index if not exists idx_platform_course_suggestions_course on public.platform_course_suggestions(course_id);
create index if not exists idx_platform_course_suggestions_target_term on public.platform_course_suggestions(target_academic_year, target_semester);
create index if not exists idx_platform_course_suggestions_active_priority on public.platform_course_suggestions(is_active, priority);

drop trigger if exists trg_platform_courses_updated_at on public.platform_courses;
create trigger trg_platform_courses_updated_at
before update on public.platform_courses
for each row
execute function public.set_updated_at();

drop trigger if exists trg_platform_course_modules_updated_at on public.platform_course_modules;
create trigger trg_platform_course_modules_updated_at
before update on public.platform_course_modules
for each row
execute function public.set_updated_at();

drop trigger if exists trg_platform_course_lessons_updated_at on public.platform_course_lessons;
create trigger trg_platform_course_lessons_updated_at
before update on public.platform_course_lessons
for each row
execute function public.set_updated_at();

drop trigger if exists trg_platform_lesson_progress_updated_at on public.platform_lesson_progress;
create trigger trg_platform_lesson_progress_updated_at
before update on public.platform_lesson_progress
for each row
execute function public.set_updated_at();

drop trigger if exists trg_platform_course_requests_updated_at on public.platform_course_enrollment_requests;
create trigger trg_platform_course_requests_updated_at
before update on public.platform_course_enrollment_requests
for each row
execute function public.set_updated_at();

drop trigger if exists trg_platform_course_suggestions_updated_at on public.platform_course_suggestions;
create trigger trg_platform_course_suggestions_updated_at
before update on public.platform_course_suggestions
for each row
execute function public.set_updated_at();

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
    where p.id = auth.uid()
      and p.role = 'student'
      and p.approved is true
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
  select exists (
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
  select exists (
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
  select exists (
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

grant execute on function private.platform_suggestion_matches_current_profile(integer, integer) to authenticated;
grant execute on function private.can_select_platform_course(uuid, text, boolean, boolean) to authenticated;
grant execute on function private.can_select_platform_course_by_id(uuid) to authenticated;
grant execute on function private.is_platform_course_requestable_for_current_student(uuid) to authenticated;

grant select, insert, update, delete on public.platform_courses to authenticated;
grant select, insert, update, delete on public.platform_course_modules to authenticated;
grant select, insert, update, delete on public.platform_course_lessons to authenticated;
grant select, insert, update, delete on public.platform_course_resources to authenticated;
grant select, insert, update, delete on public.platform_course_enrollments to authenticated;
grant select, insert, update, delete on public.platform_lesson_progress to authenticated;
grant select, insert, update, delete on public.platform_course_announcements to authenticated;
grant select, insert, update, delete on public.platform_course_enrollment_requests to authenticated;
grant select, insert, update, delete on public.platform_course_suggestions to authenticated;

alter table public.platform_courses enable row level security;
alter table public.platform_course_modules enable row level security;
alter table public.platform_course_lessons enable row level security;
alter table public.platform_course_resources enable row level security;
alter table public.platform_course_enrollments enable row level security;
alter table public.platform_lesson_progress enable row level security;
alter table public.platform_course_announcements enable row level security;
alter table public.platform_course_enrollment_requests enable row level security;
alter table public.platform_course_suggestions enable row level security;

create policy platform_courses_select_admin on public.platform_courses for select to authenticated using ((select private.is_admin_user()));
create policy platform_courses_select_student_visible on public.platform_courses for select to authenticated using (private.can_select_platform_course(id, enrollment_mode, is_active, is_published));
create policy platform_courses_insert_admin on public.platform_courses for insert to authenticated with check ((select private.is_admin_user()));
create policy platform_courses_update_admin on public.platform_courses for update to authenticated using ((select private.is_admin_user())) with check ((select private.is_admin_user()));
create policy platform_courses_delete_admin on public.platform_courses for delete to authenticated using ((select private.is_admin_user()));

create policy platform_modules_select_admin on public.platform_course_modules for select to authenticated using ((select private.is_admin_user()));
create policy platform_modules_select_student_visible on public.platform_course_modules for select to authenticated using (is_published is true and private.can_select_platform_course_by_id(course_id));
create policy platform_modules_insert_admin on public.platform_course_modules for insert to authenticated with check ((select private.is_admin_user()));
create policy platform_modules_update_admin on public.platform_course_modules for update to authenticated using ((select private.is_admin_user())) with check ((select private.is_admin_user()));
create policy platform_modules_delete_admin on public.platform_course_modules for delete to authenticated using ((select private.is_admin_user()));

create policy platform_lessons_select_admin on public.platform_course_lessons for select to authenticated using ((select private.is_admin_user()));
create policy platform_lessons_select_student_visible on public.platform_course_lessons for select to authenticated using (is_published is true and private.can_select_platform_course_by_id(course_id));
create policy platform_lessons_insert_admin on public.platform_course_lessons for insert to authenticated with check ((select private.is_admin_user()));
create policy platform_lessons_update_admin on public.platform_course_lessons for update to authenticated using ((select private.is_admin_user())) with check ((select private.is_admin_user()));
create policy platform_lessons_delete_admin on public.platform_course_lessons for delete to authenticated using ((select private.is_admin_user()));

create policy platform_resources_select_admin on public.platform_course_resources for select to authenticated using ((select private.is_admin_user()));
create policy platform_resources_select_student_visible on public.platform_course_resources for select to authenticated using (is_published is true and private.can_select_platform_course_by_id(course_id));
create policy platform_resources_insert_admin on public.platform_course_resources for insert to authenticated with check ((select private.is_admin_user()));
create policy platform_resources_update_admin on public.platform_course_resources for update to authenticated using ((select private.is_admin_user())) with check ((select private.is_admin_user()));
create policy platform_resources_delete_admin on public.platform_course_resources for delete to authenticated using ((select private.is_admin_user()));

create policy platform_announcements_select_admin on public.platform_course_announcements for select to authenticated using ((select private.is_admin_user()));
create policy platform_announcements_select_student_visible on public.platform_course_announcements for select to authenticated using (is_published is true and private.can_select_platform_course_by_id(course_id));
create policy platform_announcements_insert_admin on public.platform_course_announcements for insert to authenticated with check ((select private.is_admin_user()));
create policy platform_announcements_update_admin on public.platform_course_announcements for update to authenticated using ((select private.is_admin_user())) with check ((select private.is_admin_user()));
create policy platform_announcements_delete_admin on public.platform_course_announcements for delete to authenticated using ((select private.is_admin_user()));

create policy platform_enrollments_select_admin on public.platform_course_enrollments for select to authenticated using ((select private.is_admin_user()));
create policy platform_enrollments_select_own on public.platform_course_enrollments for select to authenticated using (user_id = (select auth.uid()));
create policy platform_enrollments_insert_admin on public.platform_course_enrollments for insert to authenticated with check ((select private.is_admin_user()));
create policy platform_enrollments_update_admin on public.platform_course_enrollments for update to authenticated using ((select private.is_admin_user())) with check ((select private.is_admin_user()));
create policy platform_enrollments_delete_admin on public.platform_course_enrollments for delete to authenticated using ((select private.is_admin_user()));

create policy platform_progress_select_admin on public.platform_lesson_progress for select to authenticated using ((select private.is_admin_user()));
create policy platform_progress_select_own on public.platform_lesson_progress for select to authenticated using (user_id = (select auth.uid()));
create policy platform_progress_insert_own on public.platform_lesson_progress for insert to authenticated with check (user_id = (select auth.uid()) and private.can_select_platform_course_by_id(course_id));
create policy platform_progress_update_own on public.platform_lesson_progress for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and private.can_select_platform_course_by_id(course_id));
create policy platform_progress_update_admin on public.platform_lesson_progress for update to authenticated using ((select private.is_admin_user())) with check ((select private.is_admin_user()));
create policy platform_progress_delete_admin on public.platform_lesson_progress for delete to authenticated using ((select private.is_admin_user()));

create policy platform_requests_select_admin on public.platform_course_enrollment_requests for select to authenticated using ((select private.is_admin_user()));
create policy platform_requests_select_own on public.platform_course_enrollment_requests for select to authenticated using (user_id = (select auth.uid()));
create policy platform_requests_insert_own on public.platform_course_enrollment_requests for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending' and private.is_platform_course_requestable_for_current_student(course_id));
create policy platform_requests_update_admin on public.platform_course_enrollment_requests for update to authenticated using ((select private.is_admin_user())) with check ((select private.is_admin_user()));
create policy platform_requests_delete_admin on public.platform_course_enrollment_requests for delete to authenticated using ((select private.is_admin_user()));

create policy platform_suggestions_select_admin on public.platform_course_suggestions for select to authenticated using ((select private.is_admin_user()));
create policy platform_suggestions_select_student_visible on public.platform_course_suggestions for select to authenticated using (
  is_active is true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
  and private.platform_suggestion_matches_current_profile(target_academic_year, target_semester)
  and private.can_select_platform_course_by_id(course_id)
);
create policy platform_suggestions_insert_admin on public.platform_course_suggestions for insert to authenticated with check ((select private.is_admin_user()));
create policy platform_suggestions_update_admin on public.platform_course_suggestions for update to authenticated using ((select private.is_admin_user())) with check ((select private.is_admin_user()));
create policy platform_suggestions_delete_admin on public.platform_course_suggestions for delete to authenticated using ((select private.is_admin_user()));

commit;
