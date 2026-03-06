-- Optimize RLS policies to avoid per-row auth function re-evaluation and remove duplicated SELECT policies.

-- ---------- public.test_block_items ----------
drop policy if exists items_select on public.test_block_items;
drop policy if exists items_write on public.test_block_items;

drop policy if exists items_insert on public.test_block_items;
drop policy if exists items_update on public.test_block_items;
drop policy if exists items_delete on public.test_block_items;

create policy items_select
on public.test_block_items
for select
to authenticated
using (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_block_items.block_id
      and (
        b.user_id = (select auth.uid())
        or (select public.is_admin_user())
      )
  )
);

create policy items_insert
on public.test_block_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_block_items.block_id
      and (
        b.user_id = (select auth.uid())
        or (select public.is_admin_user())
      )
  )
);

create policy items_update
on public.test_block_items
for update
to authenticated
using (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_block_items.block_id
      and (
        b.user_id = (select auth.uid())
        or (select public.is_admin_user())
      )
  )
)
with check (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_block_items.block_id
      and (
        b.user_id = (select auth.uid())
        or (select public.is_admin_user())
      )
  )
);

create policy items_delete
on public.test_block_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_block_items.block_id
      and (
        b.user_id = (select auth.uid())
        or (select public.is_admin_user())
      )
  )
);

-- ---------- public.test_responses ----------
drop policy if exists responses_select on public.test_responses;
drop policy if exists responses_write on public.test_responses;

drop policy if exists responses_insert on public.test_responses;
drop policy if exists responses_update on public.test_responses;
drop policy if exists responses_delete on public.test_responses;

create policy responses_select
on public.test_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_responses.block_id
      and (
        b.user_id = (select auth.uid())
        or (select public.is_admin_user())
      )
  )
);

create policy responses_insert
on public.test_responses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_responses.block_id
      and (
        b.user_id = (select auth.uid())
        or (select public.is_admin_user())
      )
  )
);

create policy responses_update
on public.test_responses
for update
to authenticated
using (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_responses.block_id
      and (
        b.user_id = (select auth.uid())
        or (select public.is_admin_user())
      )
  )
)
with check (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_responses.block_id
      and (
        b.user_id = (select auth.uid())
        or (select public.is_admin_user())
      )
  )
);

create policy responses_delete
on public.test_responses
for delete
to authenticated
using (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_responses.block_id
      and (
        b.user_id = (select auth.uid())
        or (select public.is_admin_user())
      )
  )
);

-- ---------- public.courses ----------
drop policy if exists courses_write on public.courses;

drop policy if exists courses_insert on public.courses;
drop policy if exists courses_update on public.courses;
drop policy if exists courses_delete on public.courses;

create policy courses_insert
on public.courses
for insert
to authenticated
with check ((select public.is_admin_user()));

create policy courses_update
on public.courses
for update
to authenticated
using ((select public.is_admin_user()))
with check ((select public.is_admin_user()));

create policy courses_delete
on public.courses
for delete
to authenticated
using ((select public.is_admin_user()));

-- ---------- public.course_topics ----------
drop policy if exists topics_write on public.course_topics;

drop policy if exists topics_insert on public.course_topics;
drop policy if exists topics_update on public.course_topics;
drop policy if exists topics_delete on public.course_topics;

create policy topics_insert
on public.course_topics
for insert
to authenticated
with check ((select public.is_admin_user()));

create policy topics_update
on public.course_topics
for update
to authenticated
using ((select public.is_admin_user()))
with check ((select public.is_admin_user()));

create policy topics_delete
on public.course_topics
for delete
to authenticated
using ((select public.is_admin_user()));

-- ---------- public.questions ----------
drop policy if exists questions_write on public.questions;

drop policy if exists questions_insert on public.questions;
drop policy if exists questions_update on public.questions;
drop policy if exists questions_delete on public.questions;

create policy questions_insert
on public.questions
for insert
to authenticated
with check ((select public.is_admin_user()));

create policy questions_update
on public.questions
for update
to authenticated
using ((select public.is_admin_user()))
with check ((select public.is_admin_user()));

create policy questions_delete
on public.questions
for delete
to authenticated
using ((select public.is_admin_user()));

-- ---------- Duplicate index cleanup ----------
drop index if exists public.idx_user_presence_last_seen_at;;
