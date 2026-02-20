-- Applied migration name: add_question_sort_order_column
-- Date: 2026-02-20

alter table public.questions
  add column if not exists sort_order integer;

with ranked as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as next_sort_order
  from public.questions
)
update public.questions q
set sort_order = ranked.next_sort_order
from ranked
where q.id = ranked.id
  and (q.sort_order is null or q.sort_order < 1);

alter table public.questions
  alter column sort_order set default 1;

update public.questions
set sort_order = 1
where sort_order is null or sort_order < 1;

alter table public.questions
  alter column sort_order set not null;

create index if not exists idx_questions_sort_order
  on public.questions (sort_order, id);
