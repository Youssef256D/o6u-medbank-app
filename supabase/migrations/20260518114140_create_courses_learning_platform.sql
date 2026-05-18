begin;

create extension if not exists pgcrypto;

alter table public.courses
  add column if not exists description text,
  add column if not exists cover_image_url text,
  add column if not exists intro_video_url text,
  add column if not exists instructor_name text,
  add column if not exists instructor_bio text,
  add column if not exists level text,
  add column if not exists estimated_duration text,
  add column if not exists is_published boolean default false,
  add column if not exists enrollment_mode text default 'assigned',
  add column if not exists price numeric default 0,
  add column if not exists course_type text default 'mcq_and_lessons',
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_enrollment_mode_ck'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_enrollment_mode_ck
      check (enrollment_mode in ('assigned', 'open', 'request'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_course_type_ck'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_course_type_ck
      check (course_type in ('mcq_only', 'lessons_only', 'mcq_and_lessons'))
      not valid;
  end if;
end
$$;

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position integer default 0,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  description text,
  lesson_type text default 'video',
  video_url text,
  video_provider text,
  duration_seconds integer,
  content_html text,
  position integer default 0,
  is_free_preview boolean default false,
  is_published boolean default false,
  linked_topic_id uuid references public.course_topics(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.course_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete set null,
  lesson_id uuid references public.course_lessons(id) on delete cascade,
  title text not null,
  resource_type text default 'file',
  file_url text,
  external_url text,
  description text,
  position integer default 0,
  is_published boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.student_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  status text default 'not_started',
  progress_percent integer default 0,
  watched_seconds integer default 0,
  completed_at timestamptz,
  last_opened_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, lesson_id)
);

create table if not exists public.course_announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  body text not null,
  is_published boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.course_enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, course_id)
);

create index if not exists idx_courses_published_enrollment on public.courses(is_published, enrollment_mode, is_active);
create index if not exists idx_course_modules_course_position on public.course_modules(course_id, position);
create index if not exists idx_course_lessons_course_module_position on public.course_lessons(course_id, module_id, position);
create index if not exists idx_course_lessons_linked_topic on public.course_lessons(linked_topic_id);
create index if not exists idx_course_resources_lesson_position on public.course_resources(lesson_id, position);
create index if not exists idx_student_lesson_progress_user_course on public.student_lesson_progress(user_id, course_id);
create index if not exists idx_course_announcements_course_created on public.course_announcements(course_id, created_at desc);
create index if not exists idx_course_enrollment_requests_course_status on public.course_enrollment_requests(course_id, status);

drop trigger if exists trg_course_modules_updated_at on public.course_modules;
create trigger trg_course_modules_updated_at
before update on public.course_modules
for each row
execute function public.set_updated_at();

drop trigger if exists trg_course_lessons_updated_at on public.course_lessons;
create trigger trg_course_lessons_updated_at
before update on public.course_lessons
for each row
execute function public.set_updated_at();

drop trigger if exists trg_student_lesson_progress_updated_at on public.student_lesson_progress;
create trigger trg_student_lesson_progress_updated_at
before update on public.student_lesson_progress
for each row
execute function public.set_updated_at();

drop trigger if exists trg_course_enrollment_requests_updated_at on public.course_enrollment_requests;
create trigger trg_course_enrollment_requests_updated_at
before update on public.course_enrollment_requests
for each row
execute function public.set_updated_at();

grant select on public.courses to authenticated;
grant insert, update, delete on public.courses to authenticated;
grant select, insert, update, delete on public.course_modules to authenticated;
grant select, insert, update, delete on public.course_lessons to authenticated;
grant select, insert, update, delete on public.course_resources to authenticated;
grant select, insert, update, delete on public.student_lesson_progress to authenticated;
grant select, insert, update, delete on public.course_announcements to authenticated;
grant select, insert, update, delete on public.course_enrollment_requests to authenticated;

alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_resources enable row level security;
alter table public.student_lesson_progress enable row level security;
alter table public.course_announcements enable row level security;
alter table public.course_enrollment_requests enable row level security;

drop policy if exists courses_select_student_open_or_request_published on public.courses;
drop policy if exists courses_select_student_open_published on public.courses;
create policy courses_select_student_open_or_request_published
on public.courses
for select
to authenticated
using (
  is_active is true
  and is_published is true
  and enrollment_mode in ('open', 'request')
);

drop policy if exists enrollments_insert_student_open_course on public.user_course_enrollments;
create policy enrollments_insert_student_open_course
on public.user_course_enrollments
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.courses c
    join public.profiles p on p.id = (select auth.uid())
    where c.id = user_course_enrollments.course_id
      and c.is_active is true
      and c.is_published is true
      and c.enrollment_mode = 'open'
      and p.role = 'student'
      and p.approved is true
  )
);

drop policy if exists modules_select_admin on public.course_modules;
drop policy if exists modules_select_student_visible on public.course_modules;
drop policy if exists modules_insert_admin on public.course_modules;
drop policy if exists modules_update_admin on public.course_modules;
drop policy if exists modules_delete_admin on public.course_modules;

create policy modules_select_admin
on public.course_modules
for select
to authenticated
using ((select private.is_admin_user()));

create policy modules_select_student_visible
on public.course_modules
for select
to authenticated
using (
  is_published is true
  and exists (
    select 1
    from public.courses c
    left join public.user_course_enrollments e
      on e.course_id = c.id
      and e.user_id = (select auth.uid())
    join public.profiles p on p.id = (select auth.uid())
    where c.id = course_modules.course_id
      and c.is_active is true
      and c.is_published is true
      and p.role = 'student'
      and p.approved is true
      and (e.user_id is not null or c.enrollment_mode = 'open')
  )
);

create policy modules_insert_admin
on public.course_modules
for insert
to authenticated
with check ((select private.is_admin_user()));

create policy modules_update_admin
on public.course_modules
for update
to authenticated
using ((select private.is_admin_user()))
with check ((select private.is_admin_user()));

create policy modules_delete_admin
on public.course_modules
for delete
to authenticated
using ((select private.is_admin_user()));

drop policy if exists lessons_select_admin on public.course_lessons;
drop policy if exists lessons_select_student_visible on public.course_lessons;
drop policy if exists lessons_insert_admin on public.course_lessons;
drop policy if exists lessons_update_admin on public.course_lessons;
drop policy if exists lessons_delete_admin on public.course_lessons;

create policy lessons_select_admin
on public.course_lessons
for select
to authenticated
using ((select private.is_admin_user()));

create policy lessons_select_student_visible
on public.course_lessons
for select
to authenticated
using (
  is_published is true
  and exists (
    select 1
    from public.courses c
    join public.course_modules m on m.id = course_lessons.module_id
    left join public.user_course_enrollments e
      on e.course_id = c.id
      and e.user_id = (select auth.uid())
    join public.profiles p on p.id = (select auth.uid())
    where c.id = course_lessons.course_id
      and c.is_active is true
      and c.is_published is true
      and m.is_published is true
      and p.role = 'student'
      and p.approved is true
      and (e.user_id is not null or c.enrollment_mode = 'open' or course_lessons.is_free_preview is true)
  )
);

create policy lessons_insert_admin
on public.course_lessons
for insert
to authenticated
with check ((select private.is_admin_user()));

create policy lessons_update_admin
on public.course_lessons
for update
to authenticated
using ((select private.is_admin_user()))
with check ((select private.is_admin_user()));

create policy lessons_delete_admin
on public.course_lessons
for delete
to authenticated
using ((select private.is_admin_user()));

drop policy if exists resources_select_admin on public.course_resources;
drop policy if exists resources_select_student_visible on public.course_resources;
drop policy if exists resources_insert_admin on public.course_resources;
drop policy if exists resources_update_admin on public.course_resources;
drop policy if exists resources_delete_admin on public.course_resources;

create policy resources_select_admin
on public.course_resources
for select
to authenticated
using ((select private.is_admin_user()));

create policy resources_select_student_visible
on public.course_resources
for select
to authenticated
using (
  is_published is true
  and exists (
    select 1
    from public.course_lessons l
    where l.id = course_resources.lesson_id
      and l.course_id = course_resources.course_id
      and l.is_published is true
      and exists (
        select 1
        from public.courses c
        join public.course_modules m on m.id = l.module_id
        left join public.user_course_enrollments e
          on e.course_id = c.id
          and e.user_id = (select auth.uid())
        join public.profiles p on p.id = (select auth.uid())
        where c.id = l.course_id
          and c.is_active is true
          and c.is_published is true
          and m.is_published is true
          and p.role = 'student'
          and p.approved is true
          and (e.user_id is not null or c.enrollment_mode = 'open' or l.is_free_preview is true)
      )
  )
);

create policy resources_insert_admin
on public.course_resources
for insert
to authenticated
with check ((select private.is_admin_user()));

create policy resources_update_admin
on public.course_resources
for update
to authenticated
using ((select private.is_admin_user()))
with check ((select private.is_admin_user()));

create policy resources_delete_admin
on public.course_resources
for delete
to authenticated
using ((select private.is_admin_user()));

drop policy if exists progress_select_own_or_admin on public.student_lesson_progress;
drop policy if exists progress_insert_own on public.student_lesson_progress;
drop policy if exists progress_update_own on public.student_lesson_progress;
drop policy if exists progress_delete_admin on public.student_lesson_progress;

create policy progress_select_own_or_admin
on public.student_lesson_progress
for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin_user()));

create policy progress_insert_own
on public.student_lesson_progress
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.course_lessons l
    join public.courses c on c.id = l.course_id
    left join public.user_course_enrollments e
      on e.course_id = c.id
      and e.user_id = (select auth.uid())
    where l.id = student_lesson_progress.lesson_id
      and l.course_id = student_lesson_progress.course_id
      and l.is_published is true
      and c.is_active is true
      and c.is_published is true
      and (e.user_id is not null or c.enrollment_mode = 'open')
  )
);

create policy progress_update_own
on public.student_lesson_progress
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy progress_delete_admin
on public.student_lesson_progress
for delete
to authenticated
using ((select private.is_admin_user()));

drop policy if exists announcements_select_admin on public.course_announcements;
drop policy if exists announcements_select_student_visible on public.course_announcements;
drop policy if exists announcements_insert_admin on public.course_announcements;
drop policy if exists announcements_update_admin on public.course_announcements;
drop policy if exists announcements_delete_admin on public.course_announcements;

create policy announcements_select_admin
on public.course_announcements
for select
to authenticated
using ((select private.is_admin_user()));

create policy announcements_select_student_visible
on public.course_announcements
for select
to authenticated
using (
  is_published is true
  and exists (
    select 1
    from public.courses c
    left join public.user_course_enrollments e
      on e.course_id = c.id
      and e.user_id = (select auth.uid())
    join public.profiles p on p.id = (select auth.uid())
    where c.id = course_announcements.course_id
      and c.is_active is true
      and c.is_published is true
      and p.role = 'student'
      and p.approved is true
      and (e.user_id is not null or c.enrollment_mode = 'open')
  )
);

create policy announcements_insert_admin
on public.course_announcements
for insert
to authenticated
with check ((select private.is_admin_user()));

create policy announcements_update_admin
on public.course_announcements
for update
to authenticated
using ((select private.is_admin_user()))
with check ((select private.is_admin_user()));

create policy announcements_delete_admin
on public.course_announcements
for delete
to authenticated
using ((select private.is_admin_user()));

drop policy if exists requests_select_own_or_admin on public.course_enrollment_requests;
drop policy if exists requests_insert_own on public.course_enrollment_requests;
drop policy if exists requests_update_admin on public.course_enrollment_requests;
drop policy if exists requests_delete_admin on public.course_enrollment_requests;

create policy requests_select_own_or_admin
on public.course_enrollment_requests
for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin_user()));

create policy requests_insert_own
on public.course_enrollment_requests
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1
    from public.courses c
    join public.profiles p on p.id = (select auth.uid())
    where c.id = course_enrollment_requests.course_id
      and c.is_active is true
      and c.is_published is true
      and c.enrollment_mode = 'request'
      and p.role = 'student'
      and p.approved is true
  )
);

create policy requests_update_admin
on public.course_enrollment_requests
for update
to authenticated
using ((select private.is_admin_user()))
with check ((select private.is_admin_user()));

create policy requests_delete_admin
on public.course_enrollment_requests
for delete
to authenticated
using ((select private.is_admin_user()));

commit;
