-- Fast, database-backed question totals for the admin dashboard.
-- The browser calls this with an authenticated admin session; the function
-- verifies the caller before returning database-wide counts.

create or replace function public.get_admin_question_count_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  summary jsonb;
begin
  select p.role::text
  into caller_role
  from public.profiles p
  where p.id = auth.uid();

  if caller_role is distinct from 'admin' then
    raise exception 'Only admins can read question count summaries.'
      using errcode = '42501';
  end if;

  with question_base as (
    select
      q.id,
      q.status::text as status,
      q.created_at,
      coalesce(nullif(trim(c.course_name), ''), '(No course)') as course_name,
      coalesce(nullif(trim(ct.topic_name), ''), '(No topic)') as topic_name,
      exists (
        select 1
        from public.question_choices qc
        where qc.question_id = q.id
      ) as has_choices,
      exists (
        select 1
        from public.question_choices qc
        where qc.question_id = q.id
          and qc.is_correct
      ) as has_correct
    from public.questions q
    left join public.courses c on c.id = q.course_id
    left join public.course_topics ct on ct.id = q.topic_id
  ),
  totals as (
    select
      count(*)::int as total,
      count(*) filter (where status = 'published')::int as published,
      count(*) filter (where status = 'published' and has_choices and has_correct)::int as published_usable,
      count(*) filter (where status = 'published' and not (has_choices and has_correct))::int as published_unusable,
      count(*) filter (where status = 'draft')::int as draft,
      count(*) filter (where status = 'archived')::int as archived,
      max(created_at) as latest_question_at
    from question_base
  ),
  course_counts as (
    select
      course_name,
      count(*)::int as total,
      count(*) filter (where status = 'published')::int as published,
      count(*) filter (where status = 'published' and has_choices and has_correct)::int as published_usable,
      count(*) filter (where status = 'published' and not (has_choices and has_correct))::int as published_unusable,
      count(*) filter (where status = 'draft')::int as draft,
      count(*) filter (where status = 'archived')::int as archived
    from question_base
    group by course_name
  ),
  topic_counts as (
    select
      course_name,
      topic_name,
      count(*)::int as total,
      count(*) filter (where status = 'published')::int as published,
      count(*) filter (where status = 'published' and has_choices and has_correct)::int as published_usable,
      count(*) filter (where status = 'published' and not (has_choices and has_correct))::int as published_unusable,
      count(*) filter (where status = 'draft')::int as draft,
      count(*) filter (where status = 'archived')::int as archived
    from question_base
    group by course_name, topic_name
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'totals', coalesce((select to_jsonb(t) from totals t), '{}'::jsonb),
    'byCourse', coalesce((
      select jsonb_agg(to_jsonb(cc) order by cc.published_usable desc, cc.total desc, cc.course_name)
      from course_counts cc
    ), '[]'::jsonb),
    'byTopic', coalesce((
      select jsonb_agg(to_jsonb(tc) order by tc.course_name, tc.published_usable desc, tc.total desc, tc.topic_name)
      from topic_counts tc
    ), '[]'::jsonb)
  )
  into summary;

  return summary;
end;
$$;

revoke all on function public.get_admin_question_count_summary() from public;
grant execute on function public.get_admin_question_count_summary() to authenticated;
