begin;

-- Published rows without enough real choices or without a correct answer are
-- visible to admins but filtered out of student test generation. Remove the
-- invalid duplicate copy when a usable published question with the same stem
-- already exists in the same course.
with choice_stats as (
  select
    q.id as question_id,
    count(ch.*) filter (where coalesce(btrim(ch.choice_text), '') <> '') as nonempty_choice_count,
    count(ch.*) filter (where ch.is_correct) as correct_count
  from public.questions q
  left join public.question_choices ch on ch.question_id = q.id
  group by q.id
),
question_keys as (
  select
    q.id,
    q.course_id,
    q.status,
    regexp_replace(lower(btrim(q.stem)), '\s+', ' ', 'g') as stem_key,
    coalesce(cs.nonempty_choice_count, 0) as nonempty_choice_count,
    coalesce(cs.correct_count, 0) as correct_count
  from public.questions q
  join choice_stats cs on cs.question_id = q.id
),
duplicate_unusable as (
  select distinct q.id
  from question_keys q
  join question_keys twin
    on twin.course_id = q.course_id
   and twin.stem_key = q.stem_key
   and twin.id <> q.id
   and twin.status = 'published'
   and twin.nonempty_choice_count >= 2
   and twin.correct_count >= 1
  where q.status = 'published'
    and (q.nonempty_choice_count < 2 or q.correct_count < 1)
    and not exists (
      select 1
      from public.test_block_items item
      where item.question_id = q.id
    )
)
delete from public.questions q
using duplicate_unusable duplicate
where q.id = duplicate.id;

-- Any remaining invalid published row has no usable answer data to serve to
-- students. Move it back to draft so it no longer looks published while being
-- silently omitted from student blocks.
with choice_stats as (
  select
    q.id as question_id,
    count(ch.*) filter (where coalesce(btrim(ch.choice_text), '') <> '') as nonempty_choice_count,
    count(ch.*) filter (where ch.is_correct) as correct_count
  from public.questions q
  left join public.question_choices ch on ch.question_id = q.id
  group by q.id
),
invalid_published as (
  select q.id
  from public.questions q
  join choice_stats cs on cs.question_id = q.id
  where q.status = 'published'
    and (
      coalesce(cs.nonempty_choice_count, 0) < 2
      or coalesce(cs.correct_count, 0) < 1
    )
)
update public.questions q
set
  status = 'draft',
  updated_at = now()
from invalid_published invalid
where q.id = invalid.id;

-- Merge exact duplicate topic labels per course, ignoring case and repeated
-- whitespace. Keep the active topic with the most question rows.
with topic_question_counts as (
  select
    t.id,
    count(q.id) as question_count
  from public.course_topics t
  left join public.questions q on q.topic_id = t.id
  group by t.id
),
ranked_topics as (
  select
    t.id,
    t.course_id,
    regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') as topic_key,
    first_value(t.id) over (
      partition by t.course_id, regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g')
      order by
        t.is_active desc,
        coalesce(qc.question_count, 0) desc,
        t.sort_order asc,
        t.created_at asc,
        t.id asc
    ) as keep_id
  from public.course_topics t
  left join topic_question_counts qc on qc.id = t.id
  where coalesce(btrim(t.topic_name), '') <> ''
),
topic_moves as (
  select id as drop_id, keep_id
  from ranked_topics
  where id <> keep_id
)
update public.questions q
set
  topic_id = move.keep_id,
  updated_at = now()
from topic_moves move
where q.topic_id = move.drop_id;

with topic_question_counts as (
  select
    t.id,
    count(q.id) as question_count
  from public.course_topics t
  left join public.questions q on q.topic_id = t.id
  group by t.id
),
ranked_topics as (
  select
    t.id,
    t.course_id,
    regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') as topic_key,
    first_value(t.id) over (
      partition by t.course_id, regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g')
      order by
        t.is_active desc,
        coalesce(qc.question_count, 0) desc,
        t.sort_order asc,
        t.created_at asc,
        t.id asc
    ) as keep_id,
    min(t.sort_order) over (
      partition by t.course_id, regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g')
    ) as merged_sort_order,
    bool_or(t.is_active) over (
      partition by t.course_id, regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g')
    ) as merged_is_active
  from public.course_topics t
  left join topic_question_counts qc on qc.id = t.id
  where coalesce(btrim(t.topic_name), '') <> ''
),
topic_groups as (
  select distinct keep_id, merged_sort_order, merged_is_active
  from ranked_topics
)
update public.course_topics t
set
  sort_order = least(t.sort_order, group_meta.merged_sort_order),
  is_active = group_meta.merged_is_active,
  updated_at = now()
from topic_groups group_meta
where t.id = group_meta.keep_id
  and (
    t.sort_order is distinct from least(t.sort_order, group_meta.merged_sort_order)
    or t.is_active is distinct from group_meta.merged_is_active
  );

with topic_question_counts as (
  select
    t.id,
    count(q.id) as question_count
  from public.course_topics t
  left join public.questions q on q.topic_id = t.id
  group by t.id
),
ranked_topics as (
  select
    t.id,
    first_value(t.id) over (
      partition by t.course_id, regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g')
      order by
        t.is_active desc,
        coalesce(qc.question_count, 0) desc,
        t.sort_order asc,
        t.created_at asc,
        t.id asc
    ) as keep_id
  from public.course_topics t
  left join topic_question_counts qc on qc.id = t.id
  where coalesce(btrim(t.topic_name), '') <> ''
),
topic_moves as (
  select id as drop_id
  from ranked_topics
  where id <> keep_id
)
delete from public.course_topics t
using topic_moves move
where t.id = move.drop_id
  and not exists (
    select 1
    from public.questions q
    where q.topic_id = t.id
  );

-- Gynecology had several conceptually duplicate topic labels whose wording was
-- not identical enough for the generic case/whitespace merge above.
with gyne_course as (
  select id
  from public.courses
  where academic_year = 5
    and academic_semester = 2
    and (
      course_name ilike '%gyn%'
      or course_code ilike '%gyn%'
    )
  order by created_at asc, id asc
  limit 1
),
topic_aliases(alias_key, preferred_name, alias_name) as (
  values
    ('basic', 'Basic Gynecology', 'basic gynecology'),
    ('general', 'General Gynecology', 'general gynecology'),
    ('infection', 'Female Genital Infections', 'female genital infection'),
    ('infection', 'Female Genital Infections', 'female genital infections'),
    ('endocrinology', 'Gynecologic Endocrinology', 'gynecologic endocrinology'),
    ('endocrinology', 'Gynecologic Endocrinology', 'gynecological endocrinology')
),
topic_question_counts as (
  select
    t.id,
    count(q.id) as total_questions,
    count(q.id) filter (
      where q.status = 'published'
        and exists (
          select 1
          from public.question_choices ch
          where ch.question_id = q.id
            and coalesce(btrim(ch.choice_text), '') <> ''
        )
        and exists (
          select 1
          from public.question_choices ch
          where ch.question_id = q.id
            and ch.is_correct
        )
    ) as usable_published_questions
  from public.course_topics t
  left join public.questions q on q.topic_id = t.id
  group by t.id
),
matched_topics as (
  select
    t.id,
    a.alias_key,
    a.preferred_name,
    t.sort_order,
    t.is_active,
    t.created_at,
    coalesce(qc.total_questions, 0) as total_questions,
    coalesce(qc.usable_published_questions, 0) as usable_published_questions
  from public.course_topics t
  join gyne_course c on c.id = t.course_id
  join topic_aliases a
    on regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') = a.alias_name
  left join topic_question_counts qc on qc.id = t.id
),
ranked_topics as (
  select
    *,
    first_value(id) over (
      partition by alias_key
      order by
        usable_published_questions desc,
        total_questions desc,
        is_active desc,
        sort_order asc,
        created_at asc,
        id asc
    ) as keep_id,
    min(sort_order) over (partition by alias_key) as merged_sort_order
  from matched_topics
),
topic_moves as (
  select id as drop_id, keep_id
  from ranked_topics
  where id <> keep_id
)
update public.questions q
set
  topic_id = move.keep_id,
  updated_at = now()
from topic_moves move
where q.topic_id = move.drop_id;

with gyne_course as (
  select id
  from public.courses
  where academic_year = 5
    and academic_semester = 2
    and (
      course_name ilike '%gyn%'
      or course_code ilike '%gyn%'
    )
  order by created_at asc, id asc
  limit 1
),
topic_aliases(alias_key, preferred_name, alias_name) as (
  values
    ('basic', 'Basic Gynecology', 'basic gynecology'),
    ('general', 'General Gynecology', 'general gynecology'),
    ('infection', 'Female Genital Infections', 'female genital infection'),
    ('infection', 'Female Genital Infections', 'female genital infections'),
    ('endocrinology', 'Gynecologic Endocrinology', 'gynecologic endocrinology'),
    ('endocrinology', 'Gynecologic Endocrinology', 'gynecological endocrinology')
),
topic_question_counts as (
  select
    t.id,
    count(q.id) as total_questions,
    count(q.id) filter (
      where q.status = 'published'
        and exists (
          select 1
          from public.question_choices ch
          where ch.question_id = q.id
            and coalesce(btrim(ch.choice_text), '') <> ''
        )
        and exists (
          select 1
          from public.question_choices ch
          where ch.question_id = q.id
            and ch.is_correct
        )
    ) as usable_published_questions
  from public.course_topics t
  left join public.questions q on q.topic_id = t.id
  group by t.id
),
matched_topics as (
  select
    t.id,
    a.alias_key,
    a.preferred_name,
    t.sort_order,
    t.is_active,
    t.created_at,
    coalesce(qc.total_questions, 0) as total_questions,
    coalesce(qc.usable_published_questions, 0) as usable_published_questions
  from public.course_topics t
  join gyne_course c on c.id = t.course_id
  join topic_aliases a
    on regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') = a.alias_name
  left join topic_question_counts qc on qc.id = t.id
),
ranked_topics as (
  select
    *,
    first_value(id) over (
      partition by alias_key
      order by
        usable_published_questions desc,
        total_questions desc,
        is_active desc,
        sort_order asc,
        created_at asc,
        id asc
    ) as keep_id,
    min(sort_order) over (partition by alias_key) as merged_sort_order
  from matched_topics
),
canonical_topics as (
  select distinct keep_id, preferred_name, merged_sort_order
  from ranked_topics
)
update public.course_topics t
set
  topic_name = canonical.preferred_name,
  sort_order = least(t.sort_order, canonical.merged_sort_order),
  is_active = true,
  updated_at = now()
from canonical_topics canonical
where t.id = canonical.keep_id
  and (
    t.topic_name is distinct from canonical.preferred_name
    or t.sort_order is distinct from least(t.sort_order, canonical.merged_sort_order)
    or t.is_active is distinct from true
  );

with gyne_course as (
  select id
  from public.courses
  where academic_year = 5
    and academic_semester = 2
    and (
      course_name ilike '%gyn%'
      or course_code ilike '%gyn%'
    )
  order by created_at asc, id asc
  limit 1
),
topic_aliases(alias_key, alias_name) as (
  values
    ('basic', 'basic gynecology'),
    ('general', 'general gynecology'),
    ('infection', 'female genital infection'),
    ('infection', 'female genital infections'),
    ('endocrinology', 'gynecologic endocrinology'),
    ('endocrinology', 'gynecological endocrinology')
),
topic_question_counts as (
  select
    t.id,
    count(q.id) as total_questions
  from public.course_topics t
  left join public.questions q on q.topic_id = t.id
  group by t.id
),
matched_topics as (
  select
    t.id,
    a.alias_key,
    t.sort_order,
    t.is_active,
    t.created_at,
    coalesce(qc.total_questions, 0) as total_questions
  from public.course_topics t
  join gyne_course c on c.id = t.course_id
  join topic_aliases a
    on regexp_replace(lower(btrim(t.topic_name)), '\s+', ' ', 'g') = a.alias_name
  left join topic_question_counts qc on qc.id = t.id
),
ranked_topics as (
  select
    *,
    first_value(id) over (
      partition by alias_key
      order by
        total_questions desc,
        is_active desc,
        sort_order asc,
        created_at asc,
        id asc
    ) as keep_id
  from matched_topics
),
topic_moves as (
  select id as drop_id
  from ranked_topics
  where id <> keep_id
)
delete from public.course_topics t
using topic_moves move
where t.id = move.drop_id
  and not exists (
    select 1
    from public.questions q
    where q.topic_id = t.id
  );

commit;
