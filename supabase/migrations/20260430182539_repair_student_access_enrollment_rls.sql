begin;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

create or replace function private.is_admin_user()
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
      and p.role = 'admin'
      and p.approved is true
  );
$$;

revoke all on function private.is_admin_user() from public;
revoke all on function private.is_admin_user() from anon;
grant execute on function private.is_admin_user() to authenticated;
grant execute on function private.is_admin_user() to service_role;

create or replace function private.can_update_own_profile(
  target_id uuid,
  target_role public.app_user_role,
  target_approved boolean,
  target_year smallint,
  target_semester smallint
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
      and (
        p.approved is not true
        or (
          p.academic_year is not distinct from target_year
          and p.academic_semester is not distinct from target_semester
        )
      )
  );
$$;

revoke all on function private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint) from public;
revoke all on function private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint) from anon;
grant execute on function private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint) to authenticated;
grant execute on function private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint) to service_role;

grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.courses, public.course_topics, public.questions, public.question_choices to authenticated;
grant insert, update, delete on public.courses, public.course_topics, public.questions, public.question_choices to authenticated;
grant select, insert, update, delete on public.user_course_enrollments to authenticated;

alter table public.profiles enable row level security;
alter table public.user_course_enrollments enable row level security;
alter table public.courses enable row level security;
alter table public.course_topics enable row level security;
alter table public.questions enable row level security;
alter table public.question_choices enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_insert_admin on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_delete_admin on public.profiles;

create policy profiles_select
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin_user())
);

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (
  id = (select auth.uid())
  and role = 'student'
  and approved is false
);

create policy profiles_insert_admin
on public.profiles
for insert
to authenticated
with check ((select private.is_admin_user()));

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  and role = 'student'
)
with check (
  private.can_update_own_profile(id, role, approved, academic_year, academic_semester)
);

create policy profiles_update_admin
on public.profiles
for update
to authenticated
using ((select private.is_admin_user()))
with check ((select private.is_admin_user()));

create policy profiles_delete_admin
on public.profiles
for delete
to authenticated
using ((select private.is_admin_user()));

drop policy if exists enrollments_select on public.user_course_enrollments;
drop policy if exists enrollments_insert on public.user_course_enrollments;
drop policy if exists enrollments_update on public.user_course_enrollments;
drop policy if exists enrollments_delete on public.user_course_enrollments;

create policy enrollments_select
on public.user_course_enrollments
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_admin_user())
);

create policy enrollments_insert
on public.user_course_enrollments
for insert
to authenticated
with check ((select private.is_admin_user()));

create policy enrollments_update
on public.user_course_enrollments
for update
to authenticated
using ((select private.is_admin_user()))
with check ((select private.is_admin_user()));

create policy enrollments_delete
on public.user_course_enrollments
for delete
to authenticated
using ((select private.is_admin_user()));

drop policy if exists courses_select on public.courses;
drop policy if exists courses_select_admin on public.courses;
drop policy if exists courses_select_student_enrolled on public.courses;

create policy courses_select_admin
on public.courses
for select
to authenticated
using ((select private.is_admin_user()));

create policy courses_select_student_enrolled
on public.courses
for select
to authenticated
using (
  is_active is true
  and exists (
    select 1
    from public.user_course_enrollments e
    join public.profiles p on p.id = e.user_id
    where e.course_id = public.courses.id
      and e.user_id = (select auth.uid())
      and p.role = 'student'
      and p.approved is true
  )
);

drop policy if exists topics_select on public.course_topics;
drop policy if exists topics_select_admin on public.course_topics;
drop policy if exists topics_select_student_enrolled on public.course_topics;

create policy topics_select_admin
on public.course_topics
for select
to authenticated
using ((select private.is_admin_user()));

create policy topics_select_student_enrolled
on public.course_topics
for select
to authenticated
using (
  is_active is true
  and exists (
    select 1
    from public.user_course_enrollments e
    join public.profiles p on p.id = e.user_id
    join public.courses c on c.id = e.course_id
    where e.course_id = public.course_topics.course_id
      and e.user_id = (select auth.uid())
      and p.role = 'student'
      and p.approved is true
      and c.is_active is true
  )
);

drop policy if exists questions_select on public.questions;
drop policy if exists questions_select_admin on public.questions;
drop policy if exists questions_select_student_enrolled on public.questions;

create policy questions_select_admin
on public.questions
for select
to authenticated
using ((select private.is_admin_user()));

create policy questions_select_student_enrolled
on public.questions
for select
to authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.user_course_enrollments e
    join public.profiles p on p.id = e.user_id
    join public.courses c on c.id = e.course_id
    join public.course_topics t on t.id = public.questions.topic_id
    where e.course_id = public.questions.course_id
      and e.user_id = (select auth.uid())
      and p.role = 'student'
      and p.approved is true
      and c.is_active is true
      and t.is_active is true
      and t.course_id = public.questions.course_id
  )
);

drop policy if exists choices_select on public.question_choices;
drop policy if exists choices_select_admin on public.question_choices;
drop policy if exists choices_select_student_enrolled on public.question_choices;

create policy choices_select_admin
on public.question_choices
for select
to authenticated
using ((select private.is_admin_user()));

create policy choices_select_student_enrolled
on public.question_choices
for select
to authenticated
using (
  exists (
    select 1
    from public.questions q
    join public.user_course_enrollments e on e.course_id = q.course_id
    join public.profiles p on p.id = e.user_id
    join public.courses c on c.id = q.course_id
    join public.course_topics t on t.id = q.topic_id
    where q.id = public.question_choices.question_id
      and q.status = 'published'
      and e.user_id = (select auth.uid())
      and p.role = 'student'
      and p.approved is true
      and c.is_active is true
      and t.is_active is true
  )
);

do $$
declare
  auth_profile_id uuid;
begin
  if to_regprocedure('public.sync_profile_from_auth_user(uuid)') is not null then
    for auth_profile_id in
      select u.id
      from auth.users u
      left join public.profiles p on p.id = u.id
      where p.id is null
        and u.email is not null
        and btrim(u.email) <> ''
    loop
      perform public.sync_profile_from_auth_user(auth_profile_id);
    end loop;
  end if;
end
$$;

with single_term_enrollments as (
  select
    e.user_id,
    min(c.academic_year)::smallint as academic_year,
    min(c.academic_semester)::smallint as academic_semester,
    count(distinct (c.academic_year, c.academic_semester)) as term_count
  from public.user_course_enrollments e
  join public.courses c on c.id = e.course_id
  where c.is_active is true
  group by e.user_id
)
update public.profiles p
set
  academic_year = coalesce(p.academic_year, s.academic_year),
  academic_semester = coalesce(p.academic_semester, s.academic_semester)
from single_term_enrollments s
where p.id = s.user_id
  and p.role = 'student'
  and s.term_count = 1
  and (p.academic_year is null or p.academic_semester is null);

do $$
declare
  profile_id uuid;
begin
  if to_regprocedure('private.sync_profile_term_course_enrollments(uuid,uuid)') is not null then
    for profile_id in
      select p.id
      from public.profiles p
      where p.role = 'student'
    loop
      perform private.sync_profile_term_course_enrollments(profile_id, null);
    end loop;
  end if;
end
$$;

update public.profiles p
set approved = false
where p.role = 'student'
  and p.approved is true
  and (
    coalesce(btrim(p.phone), '') = ''
    or p.academic_year is null
    or p.academic_semester is null
    or not exists (
      select 1
      from public.user_course_enrollments e
      join public.courses c on c.id = e.course_id
      where e.user_id = p.id
        and c.is_active is true
        and c.academic_year = p.academic_year
        and c.academic_semester = p.academic_semester
    )
  );

create or replace view public.student_access_consistency_issues
with (security_invoker = true)
as
select
  p.id as profile_id,
  p.email,
  p.full_name,
  p.approved,
  p.academic_year,
  p.academic_semester,
  array_remove(array[
    case when coalesce(btrim(p.phone), '') = '' then 'missing_phone' end,
    case when p.academic_year is null or p.academic_semester is null then 'missing_term' end,
    case when p.approved is true and active_enrollment.active_count = 0 then 'approved_without_active_enrollment' end,
    case when active_enrollment.mixed_terms then 'mixed_enrollment_terms' end
  ]::text[], null) as issues
from public.profiles p
cross join lateral (
  select
    count(*)::integer as active_count,
    count(distinct (c.academic_year, c.academic_semester)) > 1 as mixed_terms
  from public.user_course_enrollments e
  join public.courses c on c.id = e.course_id
  where e.user_id = p.id
    and c.is_active is true
) active_enrollment
where p.role = 'student'
  and (
    coalesce(btrim(p.phone), '') = ''
    or p.academic_year is null
    or p.academic_semester is null
    or (p.approved is true and active_enrollment.active_count = 0)
    or active_enrollment.mixed_terms
  );

grant select on public.student_access_consistency_issues to authenticated;

commit;
