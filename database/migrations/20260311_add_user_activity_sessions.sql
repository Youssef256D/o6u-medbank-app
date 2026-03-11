-- Applied migration name: add_user_activity_sessions
-- Date: 2026-03-11

create table if not exists public.user_activity_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'student' check (role in ('student', 'admin')),
  entry_route text,
  current_route text,
  exit_route text,
  page_views integer not null default 1 check (page_views > 0),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint user_activity_sessions_time_order_ck check (ended_at is null or ended_at >= started_at),
  constraint user_activity_sessions_last_seen_ck check (last_seen_at >= started_at)
);

create index if not exists idx_user_activity_sessions_user_started_at
  on public.user_activity_sessions (user_id, started_at desc);

create index if not exists idx_user_activity_sessions_last_seen_at
  on public.user_activity_sessions (last_seen_at desc);

drop trigger if exists trg_user_activity_sessions_updated_at on public.user_activity_sessions;
create trigger trg_user_activity_sessions_updated_at
before update on public.user_activity_sessions
for each row execute function public.set_updated_at();

alter table public.user_activity_sessions enable row level security;

drop policy if exists user_activity_sessions_select on public.user_activity_sessions;
drop policy if exists user_activity_sessions_insert on public.user_activity_sessions;
drop policy if exists user_activity_sessions_update on public.user_activity_sessions;
drop policy if exists user_activity_sessions_delete on public.user_activity_sessions;

create policy user_activity_sessions_select
  on public.user_activity_sessions
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin_user());

create policy user_activity_sessions_insert
  on public.user_activity_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin_user());

create policy user_activity_sessions_update
  on public.user_activity_sessions
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin_user())
  with check (user_id = auth.uid() or public.is_admin_user());

create policy user_activity_sessions_delete
  on public.user_activity_sessions
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin_user());
