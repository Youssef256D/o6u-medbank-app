begin;

-- Restore the original Gynecology question records from the global app-state
-- backup. The backup has all 572 Gynecology questions with choices/correct
-- answers. Insert only backup questions whose original external id is not
-- already present in the relational table, so duplicate-stem questions remain
-- distinct while existing usable rows are not duplicated.
with gyne_course as (
  select id
  from public.courses
  where course_name = 'Gynecology (Gyn 504)'
  order by created_at asc, id asc
  limit 1
),
backup_questions as (
  select
    elem as payload,
    elem->>'id' as external_id,
    coalesce(elem->>'qbankTopic', elem->>'topic', '') as raw_topic_name,
    row_number() over (order by elem->>'id') as backup_order
  from public.app_state s
  cross join lateral jsonb_array_elements(s.payload) elem
  where s.storage_key = 'g:mcq_questions'
    and coalesce(elem->>'qbankCourse', elem->>'course', '') = 'Gynecology (Gyn 504)'
    and coalesce(elem->>'id', '') <> ''
),
missing_backup_questions as (
  select b.*
  from backup_questions b
  where not exists (
    select 1
    from public.questions q
    where q.course_id = (select id from gyne_course)
      and q.external_id = b.external_id
  )
),
topic_candidates as (
  select
    t.id,
    t.topic_name,
    case
      when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') = 'basic gynecology' then 'basic'
      when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('general gynecology', 'gynecology') then 'general'
      when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('female genital infection', 'female genital infections') then 'infection'
      when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('gynecologic endocrinology', 'gynecological endocrinology') then 'endocrinology'
      when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') = 'gynecologic oncology' then 'oncology'
      else regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g')
    end as topic_key,
    row_number() over (
      partition by
        case
          when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') = 'basic gynecology' then 'basic'
          when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('general gynecology', 'gynecology') then 'general'
          when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('female genital infection', 'female genital infections') then 'infection'
          when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') in ('gynecologic endocrinology', 'gynecological endocrinology') then 'endocrinology'
          when regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') = 'gynecologic oncology' then 'oncology'
          else regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g')
        end
      order by t.is_active desc, t.sort_order asc, t.created_at asc, t.id asc
    ) as topic_rank
  from public.course_topics t
  where t.course_id = (select id from gyne_course)
),
topic_lookup as (
  select id, topic_key
  from topic_candidates
  where topic_rank = 1
),
prepared_questions as (
  select
    b.payload,
    b.external_id,
    coalesce(
      lookup.id,
      (select id from public.course_topics t where t.course_id = (select id from gyne_course) order by t.is_active desc, t.sort_order asc, t.created_at asc, t.id asc limit 1)
    ) as topic_id,
    b.backup_order
  from missing_backup_questions b
  left join topic_lookup lookup
    on lookup.topic_key = case
      when regexp_replace(lower(btrim(b.raw_topic_name)), '\s+', ' ', 'g') = 'basic gynecology' then 'basic'
      when regexp_replace(lower(btrim(b.raw_topic_name)), '\s+', ' ', 'g') in ('general gynecology', 'gynecology') then 'general'
      when regexp_replace(lower(btrim(b.raw_topic_name)), '\s+', ' ', 'g') in ('female genital infection', 'female genital infections') then 'infection'
      when regexp_replace(lower(btrim(b.raw_topic_name)), '\s+', ' ', 'g') in ('gynecologic endocrinology', 'gynecological endocrinology') then 'endocrinology'
      when regexp_replace(lower(btrim(b.raw_topic_name)), '\s+', ' ', 'g') = 'gynecologic oncology' then 'oncology'
      else regexp_replace(lower(btrim(b.raw_topic_name)), '\s+', ' ', 'g')
    end
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
    (select id from gyne_course),
    pq.topic_id,
    null,
    coalesce(nullif(btrim(pq.payload->>'stem'), ''), 'Restored Gynecology question'),
    coalesce(nullif(btrim(pq.payload->>'explanation'), ''), 'No explanation provided.'),
    nullif(btrim(pq.payload->>'objective'), ''),
    case lower(coalesce(pq.payload->>'difficulty', 'medium'))
      when 'easy' then 1
      when 'hard' then 3
      else 2
    end,
    'published'::public.app_question_status,
    coalesce(nullif(pq.payload->>'dateAdded', '')::date::timestamptz, now()),
    now(),
    pq.external_id,
    nullif(btrim(coalesce(pq.payload->>'questionImage', pq.payload->>'question_image_url', '')), ''),
    nullif(btrim(coalesce(pq.payload->>'explanationImage', pq.payload->>'explanation_image_url', '')), ''),
    100000 + pq.backup_order
  from prepared_questions pq
  where pq.topic_id is not null
    and jsonb_typeof(pq.payload->'choices') = 'array'
    and jsonb_array_length(pq.payload->'choices') >= 2
    and jsonb_typeof(pq.payload->'correct') = 'array'
    and jsonb_array_length(pq.payload->'correct') >= 1
  returning id, external_id
),
choice_rows as (
  select
    inserted.id as question_id,
    upper(coalesce(choice.value->>'id', choice.value->>'label', choice.value->>'choice_label', '')) as choice_label,
    coalesce(choice.value->>'text', choice.value->>'choice_text', '') as choice_text,
    exists (
      select 1
      from jsonb_array_elements_text(pq.payload->'correct') correct_choice(value)
      where upper(correct_choice.value) = upper(coalesce(choice.value->>'id', choice.value->>'label', choice.value->>'choice_label', ''))
    ) as is_correct
  from inserted_questions inserted
  join prepared_questions pq on pq.external_id = inserted.external_id
  cross join lateral jsonb_array_elements(pq.payload->'choices') choice(value)
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

commit;
