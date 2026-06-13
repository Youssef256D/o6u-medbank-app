-- Give the client a fast, access-controlled read path that evaluates question
-- access once per question instead of once per answer choice.

alter function private.can_current_user_access_question(uuid, uuid) set search_path = '';
alter function private.can_current_user_access_question_choice(uuid) set search_path = '';

create or replace function private.get_accessible_questions_page(
  requested_limit integer default 500,
  requested_offset integer default 0
)
returns setof public.questions
language sql
stable
security definer
set search_path = ''
as $$
  with access_context as materialized (
    select
      private.is_admin_user() as is_admin,
      private.can_current_user_access_mcq() as can_access_mcq
  )
  select question.*
  from public.questions as question
  cross join access_context
  where access_context.is_admin
    or (
      question.status = 'published'::public.app_question_status
      and access_context.can_access_mcq
      and private.can_current_user_access_question(question.course_id, question.topic_id)
    )
  order by question.sort_order asc nulls last, question.created_at asc, question.id asc
  limit greatest(1, least(coalesce(requested_limit, 500), 1000))
  offset greatest(0, coalesce(requested_offset, 0));
$$;

create or replace function private.get_accessible_question_choices(
  target_question_ids uuid[]
)
returns table (
  question_id uuid,
  choice_label text,
  choice_text text,
  is_correct boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with access_context as materialized (
    select
      private.is_admin_user() as is_admin,
      private.can_current_user_access_mcq() as can_access_mcq
  ),
  accessible_questions as materialized (
    select question.id
    from public.questions as question
    cross join access_context
    where question.id = any(coalesce(target_question_ids, array[]::uuid[]))
      and (
        access_context.is_admin
        or (
          question.status = 'published'::public.app_question_status
          and access_context.can_access_mcq
          and private.can_current_user_access_question(question.course_id, question.topic_id)
        )
      )
  )
  select
    choice.question_id,
    choice.choice_label,
    choice.choice_text,
    choice.is_correct
  from public.question_choices as choice
  join accessible_questions
    on accessible_questions.id = choice.question_id
  order by choice.question_id asc, choice.choice_label asc;
$$;

create or replace function public.get_accessible_questions_page(
  requested_limit integer default 500,
  requested_offset integer default 0
)
returns setof public.questions
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.get_accessible_questions_page(requested_limit, requested_offset);
$$;

create or replace function public.get_accessible_question_choices(
  target_question_ids uuid[]
)
returns table (
  question_id uuid,
  choice_label text,
  choice_text text,
  is_correct boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.get_accessible_question_choices(target_question_ids);
$$;

revoke all on function private.get_accessible_questions_page(integer, integer) from public, anon;
revoke all on function private.get_accessible_question_choices(uuid[]) from public, anon;
revoke all on function public.get_accessible_questions_page(integer, integer) from public, anon;
revoke all on function public.get_accessible_question_choices(uuid[]) from public, anon;

grant usage on schema private to authenticated, service_role;
grant execute on function private.get_accessible_questions_page(integer, integer) to authenticated, service_role;
grant execute on function private.get_accessible_question_choices(uuid[]) to authenticated, service_role;
grant execute on function public.get_accessible_questions_page(integer, integer) to authenticated, service_role;
grant execute on function public.get_accessible_question_choices(uuid[]) to authenticated, service_role;
