-- Applied migration name: add_in_app_notifications
-- Date: 2026-02-20

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_by_name text not null default 'Admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists external_id text,
  add column if not exists recipient_user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists title text,
  add column if not exists message text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_by_name text,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.notifications
set external_id = coalesce(nullif(trim(external_id), ''), id::text),
    title = coalesce(nullif(trim(title), ''), 'Notification'),
    message = coalesce(message, ''),
    created_by_name = coalesce(nullif(trim(created_by_name), ''), 'Admin'),
    is_active = coalesce(is_active, true),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

alter table public.notifications
  alter column external_id set not null,
  alter column title set not null,
  alter column message set not null,
  alter column created_by_name set not null,
  alter column is_active set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

create unique index if not exists idx_notifications_external_id
  on public.notifications (external_id);
create index if not exists idx_notifications_created_at
  on public.notifications (created_at desc);
create index if not exists idx_notifications_recipient_created_at
  on public.notifications (recipient_user_id, created_at desc);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index if not exists idx_notification_reads_user_read_at
  on public.notification_reads (user_id, read_at desc);

create or replace function public.set_notifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.notifications
for each row execute function public.set_notifications_updated_at();

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_insert on public.notifications;
drop policy if exists notifications_update on public.notifications;
drop policy if exists notifications_delete on public.notifications;

create policy notifications_select
  on public.notifications
  for select
  to authenticated
  using (
    public.is_admin_user()
    or (
      is_active = true
      and (
        recipient_user_id is null
        or recipient_user_id = auth.uid()
      )
    )
  );

create policy notifications_insert
  on public.notifications
  for insert
  to authenticated
  with check (public.is_admin_user());

create policy notifications_update
  on public.notifications
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy notifications_delete
  on public.notifications
  for delete
  to authenticated
  using (public.is_admin_user());

drop policy if exists notification_reads_select on public.notification_reads;
drop policy if exists notification_reads_insert on public.notification_reads;
drop policy if exists notification_reads_update on public.notification_reads;
drop policy if exists notification_reads_delete on public.notification_reads;

create policy notification_reads_select
  on public.notification_reads
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin_user());

create policy notification_reads_insert
  on public.notification_reads
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin_user());

create policy notification_reads_update
  on public.notification_reads
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin_user())
  with check (user_id = auth.uid() or public.is_admin_user());

create policy notification_reads_delete
  on public.notification_reads
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin_user());
