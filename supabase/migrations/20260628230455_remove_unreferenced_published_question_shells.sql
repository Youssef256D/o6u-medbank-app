begin;

-- Remove any remaining published question shell rows that cannot be served in
-- tests because they have fewer than two real choices or no marked correct
-- choice. Keep any row that appears in test history.
with choice_stats as (
  select
    q.id as question_id,
    count(ch.*) filter (where coalesce(btrim(ch.choice_text), '') <> '') as nonempty_choice_count,
    count(ch.*) filter (where ch.is_correct and coalesce(btrim(ch.choice_text), '') <> '') as correct_choice_count
  from public.questions q
  left join public.question_choices ch on ch.question_id = q.id
  group by q.id
),
unreferenced_published_shells as (
  select q.id
  from public.questions q
  join choice_stats cs on cs.question_id = q.id
  where q.status = 'published'
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
using unreferenced_published_shells shell
where q.id = shell.id;

commit;
