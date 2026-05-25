begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 80),
  description text,
  status text not null default 'active' check (status in ('active', 'disabled')),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  token_hint text not null check (length(token_hint) between 4 and 32),
  created_by uuid references public.profiles(id) on delete set null,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_agent_permissions (
  agent_id uuid not null references public.admin_agents(id) on delete cascade,
  permission_key text not null check (
    permission_key in (
      'read_dashboard',
      'manage_content_drafts',
      'request_content_publish',
      'review_enrollments',
      'draft_announcements'
    )
  ),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (agent_id, permission_key)
);

create table if not exists public.admin_agent_action_log (
  id bigint generated always as identity primary key,
  agent_id uuid references public.admin_agents(id) on delete set null,
  action_key text not null,
  action_status text not null check (action_status in ('success', 'denied', 'failed', 'approval_requested')),
  request_payload jsonb not null default '{}'::jsonb,
  response_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_agent_approval_requests (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.admin_agents(id) on delete set null,
  action_key text not null,
  request_payload jsonb not null default '{}'::jsonb,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'executed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  execution_log_id bigint references public.admin_agent_action_log(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_agents_status on public.admin_agents(status);
create index if not exists idx_admin_agent_action_log_agent_created on public.admin_agent_action_log(agent_id, created_at desc);
create index if not exists idx_admin_agent_approval_status_created on public.admin_agent_approval_requests(status, created_at desc);

drop trigger if exists trg_admin_agents_updated_at on public.admin_agents;
create trigger trg_admin_agents_updated_at
before update on public.admin_agents
for each row
execute function public.set_updated_at();

drop trigger if exists trg_admin_agent_approval_updated_at on public.admin_agent_approval_requests;
create trigger trg_admin_agent_approval_updated_at
before update on public.admin_agent_approval_requests
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on public.admin_agents to authenticated;
grant select, insert, update, delete on public.admin_agent_permissions to authenticated;
grant select on public.admin_agent_action_log to authenticated;
grant select, update on public.admin_agent_approval_requests to authenticated;
grant select, insert, update, delete on public.admin_agents to service_role;
grant select, insert, update, delete on public.admin_agent_permissions to service_role;
grant select, insert, update, delete on public.admin_agent_action_log to service_role;
grant select, insert, update, delete on public.admin_agent_approval_requests to service_role;
grant usage, select on sequence public.admin_agent_action_log_id_seq to service_role;

alter table public.admin_agents enable row level security;
alter table public.admin_agent_permissions enable row level security;
alter table public.admin_agent_action_log enable row level security;
alter table public.admin_agent_approval_requests enable row level security;

create policy admin_agents_select_admin
on public.admin_agents for select to authenticated
using ((select private.is_admin_user()));

create policy admin_agents_insert_admin
on public.admin_agents for insert to authenticated
with check ((select private.is_admin_user()));

create policy admin_agents_update_admin
on public.admin_agents for update to authenticated
using ((select private.is_admin_user()))
with check ((select private.is_admin_user()));

create policy admin_agents_delete_admin
on public.admin_agents for delete to authenticated
using ((select private.is_admin_user()));

create policy admin_agent_permissions_select_admin
on public.admin_agent_permissions for select to authenticated
using ((select private.is_admin_user()));

create policy admin_agent_permissions_insert_admin
on public.admin_agent_permissions for insert to authenticated
with check ((select private.is_admin_user()));

create policy admin_agent_permissions_update_admin
on public.admin_agent_permissions for update to authenticated
using ((select private.is_admin_user()))
with check ((select private.is_admin_user()));

create policy admin_agent_permissions_delete_admin
on public.admin_agent_permissions for delete to authenticated
using ((select private.is_admin_user()));

create policy admin_agent_action_log_select_admin
on public.admin_agent_action_log for select to authenticated
using ((select private.is_admin_user()));

create policy admin_agent_approval_select_admin
on public.admin_agent_approval_requests for select to authenticated
using ((select private.is_admin_user()));

create policy admin_agent_approval_update_admin
on public.admin_agent_approval_requests for update to authenticated
using ((select private.is_admin_user()))
with check ((select private.is_admin_user()));

notify pgrst, 'reload schema';

commit;
