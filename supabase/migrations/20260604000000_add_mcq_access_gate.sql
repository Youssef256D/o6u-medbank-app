begin;

alter table public.profiles
  add column if not exists mcq_access_enabled boolean not null default true;

create index if not exists idx_profiles_role_approved_mcq
  on public.profiles(role, approved, mcq_access_enabled);

create or replace function private.can_current_user_access_mcq()
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
        or (
          p.role = 'student'
          and p.approved is true
          and p.mcq_access_enabled is true
        )
      )
  );
$$;

revoke all on function private.can_current_user_access_mcq() from public;
revoke all on function private.can_current_user_access_mcq() from anon;
grant execute on function private.can_current_user_access_mcq() to authenticated;
grant execute on function private.can_current_user_access_mcq() to service_role;

drop policy if exists profiles_update_self on public.profiles;

create or replace function private.can_update_own_profile(
  target_id uuid,
  target_role public.app_user_role,
  target_approved boolean,
  target_year smallint,
  target_semester smallint,
  target_mcq_access_enabled boolean
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
      and (
        p.approved is not true
        or (
          p.academic_year is not distinct from target_year
          and p.academic_semester is not distinct from target_semester
        )
      )
  );
$$;

revoke all on function private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint, boolean) from public;
revoke all on function private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint, boolean) from anon;
grant execute on function private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint, boolean) to authenticated;
grant execute on function private.can_update_own_profile(uuid, public.app_user_role, boolean, smallint, smallint, boolean) to service_role;

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  and role = 'student'
)
with check (
  private.can_update_own_profile(id, role, approved, academic_year, academic_semester, mcq_access_enabled)
);

drop policy if exists courses_select_student_enrolled on public.courses;
create policy courses_select_student_enrolled
on public.courses
for select
to authenticated
using (
  is_active is true
  and private.can_current_user_access_mcq()
  and exists (
    select 1
    from public.user_course_enrollments e
    where e.course_id = public.courses.id
      and e.user_id = (select auth.uid())
  )
);

drop policy if exists topics_select_student_enrolled on public.course_topics;
create policy topics_select_student_enrolled
on public.course_topics
for select
to authenticated
using (
  is_active is true
  and private.can_current_user_access_mcq()
  and exists (
    select 1
    from public.user_course_enrollments e
    join public.courses c on c.id = e.course_id
    where e.course_id = public.course_topics.course_id
      and e.user_id = (select auth.uid())
      and c.is_active is true
  )
);

drop policy if exists questions_select_student_enrolled on public.questions;
create policy questions_select_student_enrolled
on public.questions
for select
to authenticated
using (
  status = 'published'
  and private.can_current_user_access_mcq()
  and exists (
    select 1
    from public.user_course_enrollments e
    join public.courses enrolled_course on enrolled_course.id = e.course_id
    join public.courses question_course on question_course.id = public.questions.course_id
    join public.course_topics question_topic on question_topic.id = public.questions.topic_id
    where e.user_id = (select auth.uid())
      and enrolled_course.is_active is true
      and question_topic.is_active is true
      and question_topic.course_id = question_course.id
      and enrolled_course.academic_year = question_course.academic_year
      and enrolled_course.academic_semester = question_course.academic_semester
      and (
        enrolled_course.id = question_course.id
        or (
          private.course_code_key(enrolled_course.course_code) <> ''
          and private.course_code_key(enrolled_course.course_code) = private.course_code_key(question_course.course_code)
        )
        or private.course_name_key(enrolled_course.course_name) = private.course_name_key(question_course.course_name)
      )
  )
);

drop policy if exists choices_select_student_enrolled on public.question_choices;
create policy choices_select_student_enrolled
on public.question_choices
for select
to authenticated
using (
  private.can_current_user_access_mcq()
  and exists (
    select 1
    from public.questions q
    join public.user_course_enrollments e on true
    join public.courses enrolled_course on enrolled_course.id = e.course_id
    join public.courses question_course on question_course.id = q.course_id
    join public.course_topics question_topic on question_topic.id = q.topic_id
    where q.id = public.question_choices.question_id
      and q.status = 'published'
      and e.user_id = (select auth.uid())
      and enrolled_course.is_active is true
      and question_topic.is_active is true
      and question_topic.course_id = question_course.id
      and enrolled_course.academic_year = question_course.academic_year
      and enrolled_course.academic_semester = question_course.academic_semester
      and (
        enrolled_course.id = question_course.id
        or (
          private.course_code_key(enrolled_course.course_code) <> ''
          and private.course_code_key(enrolled_course.course_code) = private.course_code_key(question_course.course_code)
        )
        or private.course_name_key(enrolled_course.course_name) = private.course_name_key(question_course.course_name)
      )
  )
);

drop policy if exists blocks_select on public.test_blocks;
drop policy if exists blocks_insert on public.test_blocks;
drop policy if exists blocks_update on public.test_blocks;

create policy blocks_select
on public.test_blocks
for select
to authenticated
using (
  (user_id = (select auth.uid()) and private.can_current_user_access_mcq())
  or (select private.is_admin_user())
);

create policy blocks_insert
on public.test_blocks
for insert
to authenticated
with check (
  (user_id = (select auth.uid()) and private.can_current_user_access_mcq())
  or (select private.is_admin_user())
);

create policy blocks_update
on public.test_blocks
for update
to authenticated
using (
  (user_id = (select auth.uid()) and private.can_current_user_access_mcq())
  or (select private.is_admin_user())
)
with check (
  (user_id = (select auth.uid()) and private.can_current_user_access_mcq())
  or (select private.is_admin_user())
);

drop policy if exists items_select on public.test_block_items;
drop policy if exists items_write on public.test_block_items;

create policy items_select
on public.test_block_items
for select
to authenticated
using (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_block_items.block_id
      and (
        (b.user_id = (select auth.uid()) and private.can_current_user_access_mcq())
        or (select private.is_admin_user())
      )
  )
);

create policy items_write
on public.test_block_items
for all
to authenticated
using (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_block_items.block_id
      and (
        (b.user_id = (select auth.uid()) and private.can_current_user_access_mcq())
        or (select private.is_admin_user())
      )
  )
)
with check (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_block_items.block_id
      and (
        (b.user_id = (select auth.uid()) and private.can_current_user_access_mcq())
        or (select private.is_admin_user())
      )
  )
);

drop policy if exists responses_select on public.test_responses;
drop policy if exists responses_insert on public.test_responses;
drop policy if exists responses_update on public.test_responses;

create policy responses_select
on public.test_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_responses.block_id
      and (
        (b.user_id = (select auth.uid()) and private.can_current_user_access_mcq())
        or (select private.is_admin_user())
      )
  )
);

create policy responses_insert
on public.test_responses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_responses.block_id
      and b.user_id = (select auth.uid())
      and private.can_current_user_access_mcq()
  )
);

create policy responses_update
on public.test_responses
for update
to authenticated
using (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_responses.block_id
      and b.user_id = (select auth.uid())
      and private.can_current_user_access_mcq()
  )
)
with check (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_responses.block_id
      and b.user_id = (select auth.uid())
      and private.can_current_user_access_mcq()
  )
);

create or replace view public.student_question_access_diagnostics
with (security_invoker = true)
as
select
  p.id as profile_id,
  p.email,
  p.approved,
  p.academic_year,
  p.academic_semester,
  c.id as enrolled_course_id,
  c.course_name as enrolled_course_name,
  c.course_code as enrolled_course_code,
  count(distinct q.id) filter (where q.status = 'published') as published_question_count,
  count(distinct q.id) filter (where q.status = 'published' and qt.is_active is true) as active_topic_published_question_count,
  count(distinct qc.id) as answer_choice_count,
  case
    when p.approved is not true then 'not_approved'
    when p.mcq_access_enabled is not true then 'mcq_access_disabled'
    when c.id is null then 'missing_enrollment'
    when c.is_active is not true then 'inactive_course'
    when count(distinct q.id) filter (where q.status = 'published') = 0 then 'no_published_questions'
    when count(distinct qc.id) = 0 then 'missing_answer_choices_or_rls'
    else 'ok'
  end as access_status,
  p.mcq_access_enabled
from public.profiles p
left join public.user_course_enrollments e on e.user_id = p.id
left join public.courses c on c.id = e.course_id
left join public.questions q
  on q.status = 'published'
 and exists (
   select 1
   from public.courses question_course
   where question_course.id = q.course_id
     and question_course.academic_year = c.academic_year
     and question_course.academic_semester = c.academic_semester
     and (
       question_course.id = c.id
       or (
         private.course_code_key(question_course.course_code) <> ''
         and private.course_code_key(question_course.course_code) = private.course_code_key(c.course_code)
       )
       or private.course_name_key(question_course.course_name) = private.course_name_key(c.course_name)
     )
 )
left join public.course_topics qt on qt.id = q.topic_id
left join public.question_choices qc on qc.question_id = q.id
where p.role = 'student'
group by p.id, p.email, p.approved, p.academic_year, p.academic_semester, p.mcq_access_enabled, c.id, c.course_name, c.course_code, c.is_active;

commit;
