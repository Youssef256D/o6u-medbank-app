-- Keep student question reads out of recursive RLS paths.
-- These private security-definer helpers preserve the existing enrollment,
-- academic-term, course-alias, topic, publication, and MCQ-access checks.

create or replace function private.can_current_user_access_question(
  target_course_id uuid,
  target_topic_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $function$
  select exists (
    select 1
    from public.user_course_enrollments e
    join public.courses enrolled_course on enrolled_course.id = e.course_id
    join public.courses question_course on question_course.id = target_course_id
    join public.course_topics question_topic on question_topic.id = target_topic_id
    where e.user_id = (select auth.uid())
      and enrolled_course.is_active is true
      and question_course.is_active is true
      and question_topic.is_active is true
      and question_topic.course_id = question_course.id
      and enrolled_course.academic_year = question_course.academic_year
      and enrolled_course.academic_semester = question_course.academic_semester
      and (
        enrolled_course.id = question_course.id
        or (
          private.course_code_key(enrolled_course.course_code) <> ''
          and private.course_code_key(enrolled_course.course_code)
            = private.course_code_key(question_course.course_code)
        )
        or private.course_name_key(enrolled_course.course_name)
          = private.course_name_key(question_course.course_name)
      )
  );
$function$;

create or replace function private.can_current_user_access_question_choice(
  target_question_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $function$
  select exists (
    select 1
    from public.questions q
    where q.id = target_question_id
      and q.status = 'published'
      and private.can_current_user_access_question(q.course_id, q.topic_id)
  );
$function$;

revoke all on function private.can_current_user_access_question(uuid, uuid) from public;
revoke all on function private.can_current_user_access_question(uuid, uuid) from anon;
grant execute on function private.can_current_user_access_question(uuid, uuid) to authenticated;
grant execute on function private.can_current_user_access_question(uuid, uuid) to service_role;

revoke all on function private.can_current_user_access_question_choice(uuid) from public;
revoke all on function private.can_current_user_access_question_choice(uuid) from anon;
grant execute on function private.can_current_user_access_question_choice(uuid) to authenticated;
grant execute on function private.can_current_user_access_question_choice(uuid) to service_role;

drop policy if exists questions_select_student_enrolled on public.questions;
create policy questions_select_student_enrolled
on public.questions
for select
to authenticated
using (
  status = 'published'
  and (select private.can_current_user_access_mcq())
  and private.can_current_user_access_question(course_id, topic_id)
);

drop policy if exists choices_select_student_enrolled on public.question_choices;
create policy choices_select_student_enrolled
on public.question_choices
for select
to authenticated
using (
  (select private.can_current_user_access_mcq())
  and private.can_current_user_access_question_choice(question_id)
);
