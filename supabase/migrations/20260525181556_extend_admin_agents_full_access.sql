begin;

alter table public.admin_agent_permissions
  drop constraint if exists admin_agent_permissions_permission_key_check;

alter table public.admin_agent_permissions
  add constraint admin_agent_permissions_permission_key_check
  check (
    permission_key in (
      'read_dashboard',
      'manage_content_drafts',
      'request_content_publish',
      'review_enrollments',
      'draft_announcements',
      'full_admin'
    )
  );

notify pgrst, 'reload schema';

commit;
