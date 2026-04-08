-- Applied migration name: rebuild_previous_test_history_snapshots
-- Date: 2026-04-08

create table if not exists public.test_history_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  external_id text not null,
  course_id uuid references public.courses(id) on delete set null,
  session_name text,
  session_test_id text,
  mode text not null default 'tutor' check (mode in ('tutor', 'timed')),
  source text not null default 'all' check (source in ('all', 'unused', 'incorrect', 'flagged', 'previous-incorrect')),
  status text not null default 'completed' check (status = 'completed'),
  question_count integer not null default 0 check (question_count >= 0),
  duration_minutes integer not null default 20 check (duration_minutes between 5 and 300),
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  constraint test_history_entries_external_id_ck check (btrim(external_id) <> ''),
  constraint test_history_entries_payload_object_ck check (jsonb_typeof(payload) = 'object'),
  constraint test_history_entries_user_external_unique unique (user_id, external_id)
);

create index if not exists idx_test_history_entries_user_completed
  on public.test_history_entries (user_id, completed_at desc, updated_at desc);

create index if not exists idx_test_history_entries_course_completed
  on public.test_history_entries (course_id, completed_at desc);

drop trigger if exists trg_test_history_entries_updated_at on public.test_history_entries;
create trigger trg_test_history_entries_updated_at
before update on public.test_history_entries
for each row
execute function public.set_updated_at();

alter table public.test_history_entries enable row level security;

drop policy if exists test_history_entries_select on public.test_history_entries;
drop policy if exists test_history_entries_insert on public.test_history_entries;
drop policy if exists test_history_entries_update on public.test_history_entries;
drop policy if exists test_history_entries_delete on public.test_history_entries;

create policy test_history_entries_select
on public.test_history_entries
for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin_user()));

create policy test_history_entries_insert
on public.test_history_entries
for insert
to authenticated
with check (user_id = (select auth.uid()) or (select public.is_admin_user()));

create policy test_history_entries_update
on public.test_history_entries
for update
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin_user()))
with check (user_id = (select auth.uid()) or (select public.is_admin_user()));

create policy test_history_entries_delete
on public.test_history_entries
for delete
to authenticated
using ((select public.is_admin_user()));

with backup_state as (
  select
    storage_key,
    case
      when split_part(storage_key, ':', 1) = 'u'
        and split_part(storage_key, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        and split_part(storage_key, ':', 3) = 'mcq_sessions'
      then split_part(storage_key, ':', 2)::uuid
      else null
    end as scoped_user_id,
    payload
  from public.app_state
  where (
    split_part(storage_key, ':', 1) = 'u'
    and split_part(storage_key, ':', 3) = 'mcq_sessions'
  )
  or storage_key = 'mcq_sessions'
),
backup_sessions as (
  select
    coalesce(
      scoped_user_id,
      case
        when coalesce(session ->> 'ownerProfileId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (session ->> 'ownerProfileId')::uuid
        when coalesce(session ->> 'ownerAuthId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (session ->> 'ownerAuthId')::uuid
        when coalesce(session ->> 'userId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (session ->> 'userId')::uuid
        else null
      end
    ) as user_id,
    session
  from backup_state
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(payload) = 'array' then payload
      else '[]'::jsonb
    end
  ) as session
  where jsonb_typeof(session) = 'object'
    and coalesce(session ->> 'status', '') = 'completed'
    and coalesce(nullif(btrim(session ->> 'id'), ''), '') <> ''
),
backup_rows as (
  select
    s.user_id,
    nullif(btrim(s.session ->> 'id'), '') as external_id,
    c.id as course_id,
    nullif(btrim(s.session ->> 'name'), '') as session_name,
    nullif(btrim(s.session ->> 'testId'), '') as session_test_id,
    case
      when s.session ->> 'mode' = 'timed' then 'timed'
      else 'tutor'
    end as mode,
    case
      when s.session ->> 'source' in ('all', 'unused', 'incorrect', 'flagged', 'previous-incorrect')
      then s.session ->> 'source'
      else 'all'
    end as source,
    greatest(
      case
        when jsonb_typeof(s.session -> 'questionIds') = 'array' then jsonb_array_length(s.session -> 'questionIds')
        else 0
      end,
      case
        when coalesce(s.session ->> 'questionCount', '') ~ '^\d+$' then (s.session ->> 'questionCount')::integer
        else 0
      end
    ) as question_count,
    case
      when coalesce(s.session ->> 'durationMin', '') ~ '^\d+$'
      then greatest(5, least(300, (s.session ->> 'durationMin')::integer))
      else 20
    end as duration_minutes,
    case
      when coalesce(s.session ->> 'elapsedSec', '') ~ '^\d+$'
      then greatest(0, (s.session ->> 'elapsedSec')::integer)
      else 0
    end as elapsed_seconds,
    (s.session - 'dbId') as payload,
    coalesce(
      nullif(s.session ->> 'createdAt', '')::timestamptz,
      nullif(s.session ->> 'updatedAt', '')::timestamptz,
      nullif(s.session ->> 'completedAt', '')::timestamptz,
      now()
    ) as created_at,
    coalesce(
      nullif(s.session ->> 'updatedAt', '')::timestamptz,
      nullif(s.session ->> 'completedAt', '')::timestamptz,
      nullif(s.session ->> 'createdAt', '')::timestamptz,
      now()
    ) as updated_at,
    coalesce(
      nullif(s.session ->> 'completedAt', '')::timestamptz,
      nullif(s.session ->> 'updatedAt', '')::timestamptz,
      nullif(s.session ->> 'createdAt', '')::timestamptz,
      now()
    ) as completed_at
  from backup_sessions s
  left join public.courses c
    on c.course_name = nullif(
      btrim(
        case
          when jsonb_typeof(s.session -> 'courses') = 'array' then s.session -> 'courses' ->> 0
          else ''
        end
      ),
      ''
    )
  where s.user_id is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = s.user_id
    )
)
insert into public.test_history_entries (
  user_id,
  external_id,
  course_id,
  session_name,
  session_test_id,
  mode,
  source,
  status,
  question_count,
  duration_minutes,
  elapsed_seconds,
  payload,
  created_at,
  updated_at,
  completed_at
)
select
  user_id,
  external_id,
  course_id,
  session_name,
  session_test_id,
  mode,
  source,
  'completed',
  question_count,
  duration_minutes,
  elapsed_seconds,
  payload,
  created_at,
  updated_at,
  completed_at
from backup_rows
on conflict (user_id, external_id) do update
set
  course_id = excluded.course_id,
  session_name = excluded.session_name,
  session_test_id = excluded.session_test_id,
  mode = excluded.mode,
  source = excluded.source,
  question_count = excluded.question_count,
  duration_minutes = excluded.duration_minutes,
  elapsed_seconds = excluded.elapsed_seconds,
  payload = excluded.payload,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  completed_at = excluded.completed_at;

with legacy_rows as (
  select
    b.user_id,
    coalesce(nullif(btrim(b.external_id), ''), b.id::text) as external_id,
    b.course_id,
    null::text as session_name,
    null::text as session_test_id,
    case
      when b.mode::text = 'timed' then 'timed'
      else 'tutor'
    end as mode,
    case
      when b.source::text in ('all', 'unused', 'incorrect', 'flagged', 'previous-incorrect')
      then b.source::text
      else 'all'
    end as source,
    greatest(coalesce(b.question_count, 0), coalesce(snapshot.question_count, 0)) as question_count,
    case
      when b.duration_minutes between 5 and 300 then b.duration_minutes
      else 20
    end as duration_minutes,
    greatest(coalesce(b.elapsed_seconds, 0), 0) as elapsed_seconds,
    jsonb_strip_nulls(
      jsonb_build_object(
        'id', coalesce(nullif(btrim(b.external_id), ''), b.id::text),
        'ownerProfileId', b.user_id,
        'ownerAuthId', b.user_id,
        'ownerIds', jsonb_build_array(b.user_id::text),
        'mode', case when b.mode::text = 'timed' then 'timed' else 'tutor' end,
        'source', case
          when b.source::text in ('all', 'unused', 'incorrect', 'flagged', 'previous-incorrect')
          then b.source::text
          else 'all'
        end,
        'status', 'completed',
        'durationMin', case
          when b.duration_minutes between 5 and 300 then b.duration_minutes
          else 20
        end,
        'timeRemainingSec', null,
        'paused', false,
        'courses', case
          when c.course_name is not null then jsonb_build_array(c.course_name)
          else '[]'::jsonb
        end,
        'questionCount', greatest(coalesce(b.question_count, 0), coalesce(snapshot.question_count, 0)),
        'questionIds', to_jsonb(coalesce(snapshot.question_ids, array[]::text[])),
        'responses', coalesce(snapshot.responses, '{}'::jsonb),
        'currentIndex', greatest(coalesce(b.current_index, 0), 0),
        'elapsedSec', greatest(coalesce(b.elapsed_seconds, 0), 0),
        'createdAt', coalesce(b.created_at, b.updated_at, b.completed_at, now()),
        'updatedAt', coalesce(b.updated_at, b.completed_at, b.created_at, now()),
        'completedAt', coalesce(b.completed_at, b.updated_at, b.created_at, now())
      )
    ) as payload,
    coalesce(b.created_at, b.updated_at, b.completed_at, now()) as created_at,
    coalesce(b.updated_at, b.completed_at, b.created_at, now()) as updated_at,
    coalesce(b.completed_at, b.updated_at, b.created_at, now()) as completed_at
  from public.test_blocks b
  left join public.courses c
    on c.id = b.course_id
  left join lateral (
    select
      array_agg(coalesce(q.external_id, i.question_id::text) order by i.position) as question_ids,
      count(*)::integer as question_count,
      jsonb_object_agg(
        coalesce(q.external_id, i.question_id::text),
        jsonb_build_object(
          'selected', coalesce(coalesce(to_jsonb(r), '{}'::jsonb) -> 'selected_choice_labels', '[]'::jsonb),
          'flagged', case
            when jsonb_typeof(coalesce(to_jsonb(r), '{}'::jsonb) -> 'flagged') = 'boolean'
            then (coalesce(to_jsonb(r), '{}'::jsonb) ->> 'flagged')::boolean
            else false
          end,
          'struck', coalesce(coalesce(to_jsonb(r), '{}'::jsonb) -> 'struck_choice_labels', '[]'::jsonb),
          'notes', coalesce(coalesce(to_jsonb(r), '{}'::jsonb) ->> 'notes', ''),
          'timeSpentSec', case
            when coalesce(coalesce(to_jsonb(r), '{}'::jsonb) ->> 'time_spent_sec', '') ~ '^\d+$'
            then greatest((coalesce(to_jsonb(r), '{}'::jsonb) ->> 'time_spent_sec')::integer, 0)
            else 0
          end,
          'highlightedLines', '[]'::jsonb,
          'highlightedLineColors', '{}'::jsonb,
          'highlightedChoices', '{}'::jsonb,
          'textHighlights', jsonb_build_object('lines', '{}'::jsonb, 'choices', '{}'::jsonb),
          'submitted', case
            when jsonb_typeof(coalesce(to_jsonb(r), '{}'::jsonb) -> 'submitted') = 'boolean'
            then (coalesce(to_jsonb(r), '{}'::jsonb) ->> 'submitted')::boolean
            else false
          end
        )
      ) as responses
    from public.test_block_items i
    left join public.questions q
      on q.id = i.question_id
    left join public.test_responses r
      on r.block_id = i.block_id
     and r.question_id = i.question_id
    where i.block_id = b.id
  ) snapshot on true
  where b.status = 'completed'
    and exists (
      select 1
      from public.profiles p
      where p.id = b.user_id
    )
)
insert into public.test_history_entries (
  user_id,
  external_id,
  course_id,
  session_name,
  session_test_id,
  mode,
  source,
  status,
  question_count,
  duration_minutes,
  elapsed_seconds,
  payload,
  created_at,
  updated_at,
  completed_at
)
select
  user_id,
  external_id,
  course_id,
  session_name,
  session_test_id,
  mode,
  source,
  'completed',
  question_count,
  duration_minutes,
  elapsed_seconds,
  payload,
  created_at,
  updated_at,
  completed_at
from legacy_rows
on conflict (user_id, external_id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'test_history_entries'
  ) then
    alter publication supabase_realtime add table public.test_history_entries;
  end if;
end
$$;
