begin;

-- Gynecology contained imported "shell" rows: question stems without enough
-- real choices or without a marked correct answer. These rows cannot be used
-- for MCQ generation and are not referenced by test history. Delete only those
-- unusable Gynecology shells so every remaining Gynecology question is usable.
with gyne_course as (
  select id
  from public.courses
  where course_name = 'Gynecology (Gyn 504)'
     or (
       academic_year = 5
       and academic_semester = 2
       and (course_name ilike '%gyn%' or course_code ilike '%gyn%')
     )
  order by
    (course_name = 'Gynecology (Gyn 504)') desc,
    created_at asc,
    id asc
  limit 1
),
choice_stats as (
  select
    q.id as question_id,
    count(ch.*) filter (where coalesce(btrim(ch.choice_text), '') <> '') as nonempty_choice_count,
    count(ch.*) filter (where ch.is_correct and coalesce(btrim(ch.choice_text), '') <> '') as correct_choice_count
  from public.questions q
  left join public.question_choices ch on ch.question_id = q.id
  where q.course_id = (select id from gyne_course)
  group by q.id
),
unusable_shells as (
  select q.id
  from public.questions q
  join choice_stats cs on cs.question_id = q.id
  where q.course_id = (select id from gyne_course)
    and (
      coalesce(cs.nonempty_choice_count, 0) < 2
      or coalesce(cs.correct_choice_count, 0) < 1
    )
    and not exists (
      select 1
      from public.test_block_items item
      where item.question_id = q.id
    )
)
delete from public.questions q
using unusable_shells shell
where q.id = shell.id;

commit;
