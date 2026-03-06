create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'student' check (role in ('admin', 'student')),
  current_route text,
  is_online boolean not null default false,
  is_solving boolean not null default false,
  solving_started_at timestamptz,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_presence_last_seen_idx on public.user_presence(last_seen_at desc);

create or replace function public.set_user_presence_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_presence_updated_at on public.user_presence;
create trigger set_user_presence_updated_at
before update on public.user_presence
for each row
execute function public.set_user_presence_updated_at();

alter table public.user_presence enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_presence' and policyname='user_presence_select'
  ) then
    create policy user_presence_select
    on public.user_presence
    for select
    to authenticated
    using (user_id = auth.uid() or public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_presence' and policyname='user_presence_insert'
  ) then
    create policy user_presence_insert
    on public.user_presence
    for insert
    to authenticated
    with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_presence' and policyname='user_presence_update'
  ) then
    create policy user_presence_update
    on public.user_presence
    for update
    to authenticated
    using (user_id = auth.uid() or public.is_admin_user())
    with check (user_id = auth.uid() or public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_presence' and policyname='user_presence_delete'
  ) then
    create policy user_presence_delete
    on public.user_presence
    for delete
    to authenticated
    using (user_id = auth.uid() or public.is_admin_user());
  end if;
end $$;;
