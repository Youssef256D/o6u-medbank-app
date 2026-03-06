-- Scale-safe sync model for app_state
-- Global keys: g:<storage_key>
-- User keys:   u:<auth.uid>:<storage_key>

create index if not exists app_state_updated_at_idx on public.app_state (updated_at desc);

alter table public.app_state enable row level security;

-- Remove previous permissive policies
DROP POLICY IF EXISTS app_state_select_all ON public.app_state;
DROP POLICY IF EXISTS app_state_insert_sync_keys ON public.app_state;
DROP POLICY IF EXISTS app_state_update_sync_keys ON public.app_state;
DROP POLICY IF EXISTS app_state_no_delete ON public.app_state;
DROP POLICY IF EXISTS anon_can_select_app_state ON public.app_state;
DROP POLICY IF EXISTS auth_upsert_own_or_shared ON public.app_state;
DROP POLICY IF EXISTS auth_update_own_or_shared ON public.app_state;
DROP POLICY IF EXISTS deny_delete_app_state ON public.app_state;

-- Global read for bootstrap/config data (anon + authenticated)
create policy app_state_select_global
on public.app_state
for select
to anon, authenticated
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

-- Global write (kept open for current frontend architecture)
create policy app_state_write_global
on public.app_state
for insert
to anon, authenticated
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

create policy app_state_update_global
on public.app_state
for update
to anon, authenticated
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

-- User-scoped reads/writes: only the owner auth uid can access
create policy app_state_select_user_scoped
on public.app_state
for select
to authenticated
using (
  split_part(storage_key, ':', 1) = 'u'
  and split_part(storage_key, ':', 2) = auth.uid()::text
  and split_part(storage_key, ':', 3) = any(array[
    'mcq_sessions',
    'mcq_incorrect_queue',
    'mcq_flashcards'
  ])
);

create policy app_state_insert_user_scoped
on public.app_state
for insert
to authenticated
with check (
  split_part(storage_key, ':', 1) = 'u'
  and split_part(storage_key, ':', 2) = auth.uid()::text
  and split_part(storage_key, ':', 3) = any(array[
    'mcq_sessions',
    'mcq_incorrect_queue',
    'mcq_flashcards'
  ])
);

create policy app_state_update_user_scoped
on public.app_state
for update
to authenticated
using (
  split_part(storage_key, ':', 1) = 'u'
  and split_part(storage_key, ':', 2) = auth.uid()::text
  and split_part(storage_key, ':', 3) = any(array[
    'mcq_sessions',
    'mcq_incorrect_queue',
    'mcq_flashcards'
  ])
)
with check (
  split_part(storage_key, ':', 1) = 'u'
  and split_part(storage_key, ':', 2) = auth.uid()::text
  and split_part(storage_key, ':', 3) = any(array[
    'mcq_sessions',
    'mcq_incorrect_queue',
    'mcq_flashcards'
  ])
);

create policy app_state_no_delete
on public.app_state
for delete
to anon, authenticated
using (false);;
