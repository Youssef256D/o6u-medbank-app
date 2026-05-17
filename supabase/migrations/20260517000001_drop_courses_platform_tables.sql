-- Drop courses platform tables (revert 20260517000000_create_courses_platform_tables.sql)

BEGIN;

-- Remove from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.course_announcements;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_lesson_completions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_course_enrollments_courses;
ALTER PUBLICATION supabase_realtime DROP TABLE public.course_lessons;
ALTER PUBLICATION supabase_realtime DROP TABLE public.course_modules;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_course_announcements_updated_at ON public.course_announcements;
DROP TRIGGER IF EXISTS trg_user_course_enrollments_courses_updated_at ON public.user_course_enrollments_courses;
DROP TRIGGER IF EXISTS trg_course_lessons_updated_at ON public.course_lessons;
DROP TRIGGER IF EXISTS trg_course_modules_updated_at ON public.course_modules;

-- Drop tables (order matters for FK constraints)
DROP TABLE IF EXISTS public.course_announcements CASCADE;
DROP TABLE IF EXISTS public.user_lesson_completions CASCADE;
DROP TABLE IF EXISTS public.user_course_enrollments_courses CASCADE;
DROP TABLE IF EXISTS public.lesson_videos CASCADE;
DROP TABLE IF EXISTS public.course_lessons CASCADE;
DROP TABLE IF EXISTS public.course_modules CASCADE;

COMMIT;
