begin;

insert into public.admin_agent_permissions (agent_id, permission_key, created_by)
select id, 'full_admin', created_by
from public.admin_agents
where name = 'Hermes Admin Assistant'
  and status = 'active'
on conflict (agent_id, permission_key) do nothing;

commit;
