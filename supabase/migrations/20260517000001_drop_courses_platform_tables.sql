-- Drop courses platform tables (revert 20260517000000_create_courses_platform_tables.sql)

BEGIN;

-- Remove from realtime publication when those previous platform tables exist.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'course_announcements',
    'user_lesson_completions',
    'user_course_enrollments_courses',
    'course_lessons',
    'course_modules'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', table_name);
    END IF;
  END LOOP;
END
$$;

-- Drop triggers when the old tables exist.
DO $$
BEGIN
  IF to_regclass('public.course_announcements') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_course_announcements_updated_at ON public.course_announcements;
  END IF;
  IF to_regclass('public.user_course_enrollments_courses') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_user_course_enrollments_courses_updated_at ON public.user_course_enrollments_courses;
  END IF;
  IF to_regclass('public.course_lessons') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_course_lessons_updated_at ON public.course_lessons;
  END IF;
  IF to_regclass('public.course_modules') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_course_modules_updated_at ON public.course_modules;
  END IF;
END
$$;

-- Drop tables (order matters for FK constraints)
DROP TABLE IF EXISTS public.course_announcements CASCADE;
DROP TABLE IF EXISTS public.user_lesson_completions CASCADE;
DROP TABLE IF EXISTS public.user_course_enrollments_courses CASCADE;
DROP TABLE IF EXISTS public.lesson_videos CASCADE;
DROP TABLE IF EXISTS public.course_lessons CASCADE;
DROP TABLE IF EXISTS public.course_modules CASCADE;

COMMIT;
