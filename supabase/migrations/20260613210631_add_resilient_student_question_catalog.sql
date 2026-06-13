-- Return each accessible question with the canonical course/topic names and
-- answer choices in one bounded request. This avoids fragile client-side joins
-- across tables whose student RLS policies intentionally expose different rows.

create or replace function private.get_accessible_question_catalog_page(
  requested_limit integer default 500,
  requested_offset integer default 0
)
returns table (
  id uuid,
  external_id text,
  course_id uuid,
  topic_id uuid,
  author_id uuid,
  stem text,
  explanation text,
  objective text,
  difficulty smallint,
  status public.app_question_status,
  created_at timestamptz,
  sort_order integer,
  question_image_url text,
  explanation_image_url text,
  course_name text,
  topic_name text,
  choices jsonb
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
    offset greatest(0, coalesce(requested_offset, 0))
  )
  select
    question.id,
    question.external_id,
    question.course_id,
    question.topic_id,
    question.author_id,
    question.stem,
    question.explanation,
    question.objective,
    question.difficulty,
    question.status,
    question.created_at,
    question.sort_order,
    question.question_image_url,
    question.explanation_image_url,
    course.course_name,
    topic.topic_name,
    coalesce(choice_rows.choices, '[]'::jsonb) as choices
  from accessible_questions as question
  join public.courses as course on course.id = question.course_id
  join public.course_topics as topic
    on topic.id = question.topic_id
   and topic.course_id = question.course_id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'question_id', choice.question_id,
        'choice_label', choice.choice_label,
        'choice_text', choice.choice_text,
        'is_correct', choice.is_correct
      )
      order by choice.choice_label
    ) as choices
    from public.question_choices as choice
    where choice.question_id = question.id
  ) as choice_rows on true
  order by question.sort_order asc nulls last, question.created_at asc, question.id asc;
$$;

create or replace function public.get_accessible_question_catalog_page(
  requested_limit integer default 500,
  requested_offset integer default 0
)
returns table (
  id uuid,
  external_id text,
  course_id uuid,
  topic_id uuid,
  author_id uuid,
  stem text,
  explanation text,
  objective text,
  difficulty smallint,
  status public.app_question_status,
  created_at timestamptz,
  sort_order integer,
  question_image_url text,
  explanation_image_url text,
  course_name text,
  topic_name text,
  choices jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.get_accessible_question_catalog_page(requested_limit, requested_offset);
$$;

revoke all on function private.get_accessible_question_catalog_page(integer, integer) from public, anon;
revoke all on function public.get_accessible_question_catalog_page(integer, integer) from public, anon;

grant usage on schema private to authenticated, service_role;
grant execute on function private.get_accessible_question_catalog_page(integer, integer) to authenticated, service_role;
grant execute on function public.get_accessible_question_catalog_page(integer, integer) to authenticated, service_role;
