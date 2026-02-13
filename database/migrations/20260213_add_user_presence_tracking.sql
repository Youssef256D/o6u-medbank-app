-- Applied migration name: add_user_presence_tracking
-- Date: 2026-02-13

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'student' check (role in ('student', 'admin')),
  current_route text,
  is_online boolean not null default false,
  is_solving boolean not null default false,
  solving_started_at timestamptz,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_presence_last_seen_at on public.user_presence (last_seen_at desc);

create or replace function public.set_user_presence_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_presence_updated_at on public.user_presence;
create trigger trg_user_presence_updated_at
before update on public.user_presence
for each row execute function public.set_user_presence_updated_at();

alter table public.user_presence enable row level security;

drop policy if exists user_presence_select on public.user_presence;
drop policy if exists user_presence_insert on public.user_presence;
drop policy if exists user_presence_update on public.user_presence;
drop policy if exists user_presence_delete on public.user_presence;

create policy user_presence_select
  on public.user_presence
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin_user());

create policy user_presence_insert
  on public.user_presence
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin_user());

create policy user_presence_update
  on public.user_presence
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin_user())
  with check (user_id = auth.uid() or public.is_admin_user());

create policy user_presence_delete
  on public.user_presence
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin_user());
