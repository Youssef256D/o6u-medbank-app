begin;

create extension if not exists pgcrypto;

create table if not exists public.course_suggestions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  target_academic_year integer null,
  target_semester integer null,
  title text null,
  reason text null,
  priority integer default 0,
  is_active boolean default true,
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_course_suggestions_course
on public.course_suggestions(course_id);

create index if not exists idx_course_suggestions_target_term
on public.course_suggestions(target_academic_year, target_semester);

create index if not exists idx_course_suggestions_active_priority
on public.course_suggestions(is_active, priority);

drop trigger if exists trg_course_suggestions_updated_at on public.course_suggestions;
create trigger trg_course_suggestions_updated_at
before update on public.course_suggestions
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on public.course_suggestions to authenticated;

alter table public.course_suggestions enable row level security;

drop policy if exists course_suggestions_admin_select on public.course_suggestions;
drop policy if exists course_suggestions_admin_insert on public.course_suggestions;
drop policy if exists course_suggestions_admin_update on public.course_suggestions;
drop policy if exists course_suggestions_admin_delete on public.course_suggestions;
drop policy if exists course_suggestions_student_select_active on public.course_suggestions;

create policy course_suggestions_admin_select
on public.course_suggestions
for select
to authenticated
using ((select private.is_admin_user()));

create policy course_suggestions_admin_insert
on public.course_suggestions
for insert
to authenticated
with check ((select private.is_admin_user()));

create policy course_suggestions_admin_update
on public.course_suggestions
for update
to authenticated
using ((select private.is_admin_user()))
with check ((select private.is_admin_user()));

create policy course_suggestions_admin_delete
on public.course_suggestions
for delete
to authenticated
using ((select private.is_admin_user()));

create policy course_suggestions_student_select_active
on public.course_suggestions
for select
to authenticated
using (
  is_active is true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
  and exists (
    select 1
    from public.courses c
    join public.profiles p on p.id = (select auth.uid())
    left join public.user_course_enrollments e
      on e.course_id = c.id
      and e.user_id = (select auth.uid())
    where c.id = course_suggestions.course_id
      and c.is_active is true
      and c.is_published is true
      and p.role = 'student'
      and p.approved is true
      and (
        c.enrollment_mode in ('open', 'request')
        or e.user_id is not null
      )
      and (
        (course_suggestions.target_academic_year is null and course_suggestions.target_semester is null)
        or (
          course_suggestions.target_academic_year = p.academic_year
          and course_suggestions.target_semester is null
        )
        or (
          course_suggestions.target_academic_year = p.academic_year
          and course_suggestions.target_semester = p.academic_semester
        )
      )
      and (
        not exists (
          select 1
          from public.course_lessons l
          where l.course_id = c.id
            and l.is_published is true
        )
        or exists (
          select 1
          from public.course_lessons l
          where l.course_id = c.id
            and l.is_published is true
            and not exists (
              select 1
              from public.student_lesson_progress slp
              where slp.user_id = (select auth.uid())
                and slp.lesson_id = l.id
                and (
                  slp.status = 'completed'
                  or slp.progress_percent >= 100
                )
            )
        )
      )
  )
);

commit;
