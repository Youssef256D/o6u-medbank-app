-- Optimize RLS policy performance and remove duplicate index

drop index if exists public.appstate_updated_at_idx;

DROP POLICY IF EXISTS app_state_select_global ON public.app_state;
DROP POLICY IF EXISTS app_state_write_global ON public.app_state;
DROP POLICY IF EXISTS app_state_update_global ON public.app_state;
DROP POLICY IF EXISTS app_state_select_user_scoped ON public.app_state;
DROP POLICY IF EXISTS app_state_insert_user_scoped ON public.app_state;
DROP POLICY IF EXISTS app_state_update_user_scoped ON public.app_state;
DROP POLICY IF EXISTS app_state_no_delete ON public.app_state;

create policy app_state_select_anon
on public.app_state
for select
to anon
using (
  storage_key like 'g:%'
  or storage_key = any(array[
    'mcq_users',
    'mcq_questions',
    'mcq_filter_presets',
    'mcq_invites',
    'mcq_feedback',
    'mcq_curriculum',
    'mcq_course_topics'
  ])
);

create policy app_state_select_authenticated
on public.app_state
for select
to authenticated
using (
  storage_key like 'g:%'
  or storage_key = any(array[
    'mcq_users',
    'mcq_questions',
    'mcq_filter_presets',
    'mcq_invites',
    'mcq_feedback',
    'mcq_curriculum',
    'mcq_course_topics'
  ])
  or (
    split_part(storage_key, ':', 1) = 'u'
    and split_part(storage_key, ':', 2) = (select auth.uid())::text
    and split_part(storage_key, ':', 3) = any(array[
      'mcq_sessions',
      'mcq_incorrect_queue',
      'mcq_flashcards'
    ])
  )
);

create policy app_state_insert_anon
on public.app_state
for insert
to anon
with check (
  storage_key like 'g:%'
  or storage_key = any(array[
    'mcq_users',
    'mcq_questions',
    'mcq_filter_presets',
    'mcq_invites',
    'mcq_feedback',
    'mcq_curriculum',
    'mcq_course_topics'
  ])
);

create policy app_state_insert_authenticated
on public.app_state
for insert
to authenticated
with check (
  storage_key like 'g:%'
  or storage_key = any(array[
    'mcq_users',
    'mcq_questions',
    'mcq_filter_presets',
    'mcq_invites',
    'mcq_feedback',
    'mcq_curriculum',
    'mcq_course_topics'
  ])
  or (
    split_part(storage_key, ':', 1) = 'u'
    and split_part(storage_key, ':', 2) = (select auth.uid())::text
    and split_part(storage_key, ':', 3) = any(array[
      'mcq_sessions',
      'mcq_incorrect_queue',
      'mcq_flashcards'
    ])
  )
);

create policy app_state_update_anon
on public.app_state
for update
to anon
using (
  storage_key like 'g:%'
  or storage_key = any(array[
    'mcq_users',
    'mcq_questions',
    'mcq_filter_presets',
    'mcq_invites',
    'mcq_feedback',
    'mcq_curriculum',
    'mcq_course_topics'
  ])
)
with check (
  storage_key like 'g:%'
  or storage_key = any(array[
    'mcq_users',
    'mcq_questions',
    'mcq_filter_presets',
    'mcq_invites',
    'mcq_feedback',
    'mcq_curriculum',
    'mcq_course_topics'
  ])
);

create policy app_state_update_authenticated
on public.app_state
for update
to authenticated
using (
  storage_key like 'g:%'
  or storage_key = any(array[
    'mcq_users',
    'mcq_questions',
    'mcq_filter_presets',
    'mcq_invites',
    'mcq_feedback',
    'mcq_curriculum',
    'mcq_course_topics'
  ])
  or (
    split_part(storage_key, ':', 1) = 'u'
    and split_part(storage_key, ':', 2) = (select auth.uid())::text
    and split_part(storage_key, ':', 3) = any(array[
      'mcq_sessions',
      'mcq_incorrect_queue',
      'mcq_flashcards'
    ])
  )
)
with check (
  storage_key like 'g:%'
  or storage_key = any(array[
    'mcq_users',
    'mcq_questions',
    'mcq_filter_presets',
    'mcq_invites',
    'mcq_feedback',
    'mcq_curriculum',
    'mcq_course_topics'
  ])
  or (
    split_part(storage_key, ':', 1) = 'u'
    and split_part(storage_key, ':', 2) = (select auth.uid())::text
    and split_part(storage_key, ':', 3) = any(array[
      'mcq_sessions',
      'mcq_incorrect_queue',
      'mcq_flashcards'
    ])
  )
);

create policy app_state_no_delete
on public.app_state
for delete
to anon, authenticated
using (false);;
