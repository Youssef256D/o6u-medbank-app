begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'course-materials',
  'course-materials',
  false,
  104857600,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/zip'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists course_materials_admin_select on storage.objects;
drop policy if exists course_materials_student_select_visible_course on storage.objects;
drop policy if exists course_materials_admin_insert on storage.objects;
drop policy if exists course_materials_admin_update on storage.objects;
drop policy if exists course_materials_admin_delete on storage.objects;

create policy course_materials_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'course-materials'
  and (select private.is_admin_user())
);

create policy course_materials_student_select_visible_course
on storage.objects
for select
to authenticated
using (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = 'courses'
  and coalesce((storage.foldername(name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.can_select_platform_course_by_id(((storage.foldername(name))[2])::uuid)
);

create policy course_materials_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = 'courses'
  and coalesce((storage.foldername(name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (select private.is_admin_user())
);

create policy course_materials_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'course-materials'
  and (select private.is_admin_user())
)
with check (
  bucket_id = 'course-materials'
  and (select private.is_admin_user())
);

create policy course_materials_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'course-materials'
  and (select private.is_admin_user())
);

commit;
