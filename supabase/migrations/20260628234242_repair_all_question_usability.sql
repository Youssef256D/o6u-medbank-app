begin;

-- Make every stored backup-backed question usable for student tests.
--
-- Current live state before this migration:
-- - 111 draft shell rows have no usable answer choices but do have complete
--   backup payloads in app_state.
-- - 3 backup-backed Neurology questions are missing from the relational table.
-- - 56 archived rows already have complete choices/correct answers.
--
-- This migration repairs/restores only rows with real backup choices and a
-- resolvable course. It does not invent choices or collapse duplicate stems.
with backup_questions as (
  select
    elem as payload,
    elem->>'id' as external_id,
    coalesce(elem->>'qbankCourse', elem->>'course', '') as raw_course_name,
    coalesce(elem->>'qbankTopic', elem->>'topic', '') as raw_topic_name,
    row_number() over (order by elem->>'id') as backup_order
  from public.app_state s
  cross join lateral jsonb_array_elements(s.payload) elem
  where s.storage_key = 'g:mcq_questions'
    and coalesce(elem->>'id', '') <> ''
    and jsonb_typeof(elem->'choices') = 'array'
    and jsonb_array_length(elem->'choices') >= 2
    and jsonb_typeof(elem->'correct') = 'array'
    and jsonb_array_length(elem->'correct') >= 1
),
course_lookup as (
  select
    b.*,
    c.id as course_id
  from backup_questions b
  join public.courses c
    on regexp_replace(lower(btrim(c.course_name)), '\s+', ' ', 'g')
      = regexp_replace(lower(btrim(b.raw_course_name)), '\s+', ' ', 'g')
),
topic_candidates as (
  select
    t.course_id,
    t.id,
    case
      when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('basic gynecology') then 'basic gynecology'
      when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('general gynecology', 'gynecology') then 'general gynecology'
      when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('female genital infection', 'female genital infections') then 'female genital infections'
      when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('gynecologic endocrinology', 'gynecological endocrinology') then 'gynecologic endocrinology'
      when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('gynecologic oncology') then 'gynecologic oncology'
      else regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g')
    end as topic_key,
    row_number() over (
      partition by
        t.course_id,
        case
          when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('basic gynecology') then 'basic gynecology'
          when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('general gynecology', 'gynecology') then 'general gynecology'
          when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('female genital infection', 'female genital infections') then 'female genital infections'
          when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('gynecologic endocrinology', 'gynecological endocrinology') then 'gynecologic endocrinology'
          when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('gynecologic oncology') then 'gynecologic oncology'
          else regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g')
        end
      order by t.is_active desc, t.sort_order asc, t.created_at asc, t.id asc
    ) as topic_rank
  from public.course_topics t
),
topic_lookup as (
  select course_id, id, topic_key
  from topic_candidates
  where topic_rank = 1
),
fallback_topics as (
  select course_id, id
  from (
    select
      t.course_id,
      t.id,
      row_number() over (
        partition by t.course_id
        order by t.is_active desc, t.sort_order asc, t.created_at asc, t.id asc
      ) as topic_rank
    from public.course_topics t
  ) ranked
  where topic_rank = 1
),
prepared_backup as (
  select
    c.payload,
    c.external_id,
    c.course_id,
    coalesce(t.id, ft.id) as topic_id,
    c.backup_order
  from course_lookup c
  left join topic_lookup t
    on t.course_id = c.course_id
   and t.topic_key = case
      when regexp_replace(lower(btrim(c.raw_topic_name)), '\s+', ' ', 'g') in ('basic gynecology') then 'basic gynecology'
      when regexp_replace(lower(btrim(c.raw_topic_name)), '\s+', ' ', 'g') in ('general gynecology', 'gynecology') then 'general gynecology'
      when regexp_replace(lower(btrim(c.raw_topic_name)), '\s+', ' ', 'g') in ('female genital infection', 'female genital infections') then 'female genital infections'
      when regexp_replace(lower(btrim(c.raw_topic_name)), '\s+', ' ', 'g') in ('gynecologic endocrinology', 'gynecological endocrinology') then 'gynecologic endocrinology'
      when regexp_replace(lower(btrim(c.raw_topic_name)), '\s+', ' ', 'g') in ('gynecologic oncology') then 'gynecologic oncology'
      else regexp_replace(lower(btrim(c.raw_topic_name)), '\s+', ' ', 'g')
    end
  left join fallback_topics ft on ft.course_id = c.course_id
  where coalesce(t.id, ft.id) is not null
),
choice_stats as (
  select
    question_id,
    count(*) as choice_count,
    count(*) filter (where is_correct) as correct_count
  from public.question_choices
  group by question_id
),
repair_targets as (
  select
    q.id,
    pb.payload,
    pb.external_id,
    pb.course_id,
    pb.topic_id
  from public.questions q
  join prepared_backup pb on pb.external_id = q.external_id
  left join choice_stats cs on cs.question_id = q.id
  where coalesce(cs.choice_count, 0) < 2
     or coalesce(cs.correct_count, 0) < 1
),
updated_questions as (
  update public.questions q
  set
    course_id = rt.course_id,
    topic_id = rt.topic_id,
    stem = coalesce(nullif(btrim(rt.payload->>'stem'), ''), q.stem, 'Restored question'),
    explanation = coalesce(nullif(btrim(rt.payload->>'explanation'), ''), q.explanation, 'No explanation provided.'),
    objective = nullif(btrim(rt.payload->>'objective'), ''),
    difficulty = case lower(coalesce(rt.payload->>'difficulty', 'medium'))
      when 'easy' then 1
      when 'hard' then 3
      else 2
    end,
    status = 'published'::public.app_question_status,
    question_image_url = nullif(btrim(coalesce(rt.payload->>'questionImage', rt.payload->>'question_image_url', '')), ''),
    explanation_image_url = nullif(btrim(coalesce(rt.payload->>'explanationImage', rt.payload->>'explanation_image_url', '')), ''),
    updated_at = now()
  from repair_targets rt
  where q.id = rt.id
  returning q.id, q.external_id
),
deleted_repaired_choices as (
  delete from public.question_choices qc
  using updated_questions uq
  where qc.question_id = uq.id
),
missing_backup_questions as (
  select pb.*
  from prepared_backup pb
  where not exists (
    select 1
    from public.questions q
    where q.external_id = pb.external_id
  )
),
inserted_questions as (
  insert into public.questions (
    course_id,
    topic_id,
    author_id,
    stem,
    explanation,
    objective,
    difficulty,
    status,
    created_at,
    updated_at,
    external_id,
    question_image_url,
    explanation_image_url,
    sort_order
  )
  select
    mbq.course_id,
    mbq.topic_id,
    null,
    coalesce(nullif(btrim(mbq.payload->>'stem'), ''), 'Restored question'),
    coalesce(nullif(btrim(mbq.payload->>'explanation'), ''), 'No explanation provided.'),
    nullif(btrim(mbq.payload->>'objective'), ''),
    case lower(coalesce(mbq.payload->>'difficulty', 'medium'))
      when 'easy' then 1
      when 'hard' then 3
      else 2
    end,
    'published'::public.app_question_status,
    case
      when coalesce(mbq.payload->>'dateAdded', '') ~ '^\d{4}-\d{2}-\d{2}' then (mbq.payload->>'dateAdded')::date::timestamptz
      else now()
    end,
    now(),
    mbq.external_id,
    nullif(btrim(coalesce(mbq.payload->>'questionImage', mbq.payload->>'question_image_url', '')), ''),
    nullif(btrim(coalesce(mbq.payload->>'explanationImage', mbq.payload->>'explanation_image_url', '')), ''),
    100000 + mbq.backup_order
  from missing_backup_questions mbq
  returning id, external_id
),
changed_questions as (
  select id, external_id from updated_questions
  union all
  select id, external_id from inserted_questions
),
choice_rows as (
  select
    cq.id as question_id,
    upper(btrim(coalesce(choice.value->>'id', choice.value->>'label', choice.value->>'choice_label', ''))) as choice_label,
    coalesce(choice.value->>'text', choice.value->>'choice_text', '') as choice_text,
    exists (
      select 1
      from jsonb_array_elements_text(pb.payload->'correct') correct_choice(value)
      where upper(btrim(correct_choice.value)) = upper(btrim(coalesce(choice.value->>'id', choice.value->>'label', choice.value->>'choice_label', '')))
         or btrim(correct_choice.value) = btrim(coalesce(choice.value->>'text', choice.value->>'choice_text', ''))
    ) as is_correct
  from changed_questions cq
  join prepared_backup pb on pb.external_id = cq.external_id
  cross join lateral jsonb_array_elements(pb.payload->'choices') choice(value)
)
insert into public.question_choices (question_id, choice_label, choice_text, is_correct)
select
  question_id,
  choice_label,
  choice_text,
  is_correct
from choice_rows
where choice_label in ('A', 'B', 'C', 'D', 'E')
  and coalesce(btrim(choice_text), '') <> ''
on conflict (question_id, choice_label) do update
set
  choice_text = excluded.choice_text,
  is_correct = excluded.is_correct;

with choice_stats as (
  select
    question_id,
    count(*) as choice_count,
    count(*) filter (where is_correct) as correct_count
  from public.question_choices
  group by question_id
)
update public.questions q
set
  status = 'published'::public.app_question_status,
  updated_at = now()
from choice_stats cs
where cs.question_id = q.id
  and q.status <> 'published'::public.app_question_status
  and cs.choice_count >= 2
  and cs.correct_count >= 1;

commit;
