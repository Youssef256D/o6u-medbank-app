begin;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

create or replace function private.course_code_key(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(coalesce(value, '')), '\s+', '', 'g');
$$;

create or replace function private.course_name_key(value text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(
    regexp_replace(lower(coalesce(value, '')), '\([^)]*\)', ' ', 'g'),
    '[^a-z0-9]+',
    ' ',
    'g'
  ));
$$;

revoke all on function private.course_code_key(text) from public;
revoke all on function private.course_code_key(text) from anon;
grant execute on function private.course_code_key(text) to authenticated;
grant execute on function private.course_code_key(text) to service_role;

revoke all on function private.course_name_key(text) from public;
revoke all on function private.course_name_key(text) from anon;
grant execute on function private.course_name_key(text) to authenticated;
grant execute on function private.course_name_key(text) to service_role;

update public.courses
set course_code = nullif(substring(course_name from '\(([A-Za-z]{2,10}\s*[0-9]{2,4})\)\s*$'), '')
where coalesce(btrim(course_code), '') = ''
  and substring(course_name from '\(([A-Za-z]{2,10}\s*[0-9]{2,4})\)\s*$') is not null;

with question_targets as (
  select
    q.id as question_id,
    q.course_id as old_course_id,
    q.topic_id as old_topic_id,
    old_topic.topic_name,
    old_topic.sort_order,
    canonical_course.id as new_course_id
  from public.questions q
  join public.courses old_course on old_course.id = q.course_id
  join public.course_topics old_topic on old_topic.id = q.topic_id
  join lateral (
    select c.id
    from public.courses c
    where c.is_active is true
      and c.academic_year = old_course.academic_year
      and c.academic_semester = old_course.academic_semester
      and (
        (
          private.course_code_key(c.course_code) <> ''
          and private.course_code_key(c.course_code) = private.course_code_key(old_course.course_code)
        )
        or private.course_name_key(c.course_name) = private.course_name_key(old_course.course_name)
      )
    order by
      (c.id = old_course.id) desc,
      c.updated_at desc nulls last,
      c.created_at desc nulls last,
      c.id
    limit 1
  ) canonical_course on true
  where q.course_id is distinct from canonical_course.id
     or old_topic.course_id is distinct from canonical_course.id
),
topic_repairs as (
  insert into public.course_topics (course_id, topic_name, sort_order, is_active)
  select distinct
    qt.new_course_id,
    qt.topic_name,
    coalesce(nullif(qt.sort_order, 0), 100),
    true
  from question_targets qt
  where coalesce(btrim(qt.topic_name), '') <> ''
  on conflict (course_id, topic_name) do update
    set is_active = true,
        sort_order = least(public.course_topics.sort_order, excluded.sort_order)
  returning id, course_id, topic_name
)
update public.questions q
set
  course_id = qt.new_course_id,
  topic_id = repaired_topic.id
from question_targets qt
join public.course_topics repaired_topic
  on repaired_topic.course_id = qt.new_course_id
 and repaired_topic.topic_name = qt.topic_name
where q.id = qt.question_id
  and (
    q.course_id is distinct from qt.new_course_id
    or q.topic_id is distinct from repaired_topic.id
  );

drop policy if exists questions_select_student_enrolled on public.questions;
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
    join public.courses enrolled_course on enrolled_course.id = e.course_id
    join public.courses question_course on question_course.id = public.questions.course_id
    join public.course_topics question_topic on question_topic.id = public.questions.topic_id
    where e.user_id = (select auth.uid())
      and p.role = 'student'
      and p.approved is true
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
  exists (
    select 1
    from public.questions q
    join public.user_course_enrollments e on true
    join public.profiles p on p.id = e.user_id
    join public.courses enrolled_course on enrolled_course.id = e.course_id
    join public.courses question_course on question_course.id = q.course_id
    join public.course_topics question_topic on question_topic.id = q.topic_id
    where q.id = public.question_choices.question_id
      and q.status = 'published'
      and e.user_id = (select auth.uid())
      and p.role = 'student'
      and p.approved is true
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
    when c.id is null then 'missing_enrollment'
    when c.is_active is not true then 'inactive_course'
    when count(distinct q.id) filter (where q.status = 'published') = 0 then 'no_published_questions'
    when count(distinct qc.id) = 0 then 'missing_answer_choices_or_rls'
    else 'ok'
  end as access_status
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
group by p.id, p.email, p.approved, p.academic_year, p.academic_semester, c.id, c.course_name, c.course_code, c.is_active;

grant select on public.student_question_access_diagnostics to authenticated;

commit;
