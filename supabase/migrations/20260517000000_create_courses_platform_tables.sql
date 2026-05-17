-- Create courses platform tables for the O6U Learning Platform
-- Adds: course_modules, course_lessons, lesson_videos, user_course_enrollments_courses,
--       user_lesson_completions, course_announcements

BEGIN;

-- Course modules (course syllabus structure)
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_modules_course_sort_idx ON public.course_modules (course_id, sort_order, title);

-- Course lessons within modules
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  content_type VARCHAR(50) NOT NULL DEFAULT 'video'
    CHECK (content_type IN ('video', 'article', 'quiz', 'assignment', 'reading')),
  content_url TEXT DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_lessons_module_sort_idx ON public.course_lessons (module_id, sort_order, title);

-- Lesson video sources (supports YouTube, Vimeo, MP4, HLS)
CREATE TABLE IF NOT EXISTS public.lesson_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  video_type VARCHAR(20) NOT NULL DEFAULT 'youtube'
    CHECK (video_type IN ('youtube', 'vimeo', 'mp4', 'hls', 'other')),
  quality VARCHAR(10) DEFAULT '',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lesson_videos_lesson_primary_idx ON public.lesson_videos (lesson_id, is_primary DESC, sort_order);

-- User enrollments for courses platform (separate from MCQ enrollments)
CREATE TABLE IF NOT EXISTS public.user_course_enrollments_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS user_course_enrollments_courses_user_idx ON public.user_course_enrollments_courses (user_id, is_active);
CREATE INDEX IF NOT EXISTS user_course_enrollments_courses_course_idx ON public.user_course_enrollments_courses (course_id);

-- User lesson completion tracking
CREATE TABLE IF NOT EXISTS public.user_lesson_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_spent_sec INTEGER NOT NULL DEFAULT 0 CHECK (time_spent_sec >= 0),
  watch_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (watch_percent BETWEEN 0 AND 100),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS user_lesson_completions_user_idx ON public.user_lesson_completions (user_id, lesson_id);

-- Course announcements (for instructor communications)
CREATE TABLE IF NOT EXISTS public.course_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_announcements_course_pinned_idx ON public.course_announcements (course_id, is_pinned DESC, created_at DESC);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_course_modules_updated_at ON public.course_modules;
CREATE TRIGGER trg_course_modules_updated_at
BEFORE UPDATE ON public.course_modules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_course_lessons_updated_at ON public.course_lessons;
CREATE TRIGGER trg_course_lessons_updated_at
BEFORE UPDATE ON public.course_lessons
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_course_enrollments_courses_updated_at ON public.user_course_enrollments_courses;
CREATE TRIGGER trg_user_course_enrollments_courses_updated_at
BEFORE UPDATE ON public.user_course_enrollments_courses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_course_announcements_updated_at ON public.course_announcements;
CREATE TRIGGER trg_course_announcements_updated_at
BEFORE UPDATE ON public.course_announcements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable RLS on all new tables
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_enrollments_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_announcements ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read active content
CREATE POLICY "Authenticated users can read course_modules"
  ON public.course_modules FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "Authenticated users can read course_lessons"
  ON public.course_lessons FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "Authenticated users can read lesson_videos"
  ON public.lesson_videos FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can read their own enrollments"
  ON public.user_course_enrollments_courses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own enrollments"
  ON public.user_course_enrollments_courses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own enrollments"
  ON public.user_course_enrollments_courses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read their own lesson completions"
  ON public.user_lesson_completions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own lesson completions"
  ON public.user_lesson_completions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own lesson completions"
  ON public.user_lesson_completions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can read course announcements"
  ON public.course_announcements FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Admin full access policies
CREATE POLICY "Admin full access course_modules"
  ON public.course_modules FOR ALL
  TO authenticated
  USING ((SELECT private.is_admin_user()))
  WITH CHECK ((SELECT private.is_admin_user()));

CREATE POLICY "Admin full access course_lessons"
  ON public.course_lessons FOR ALL
  TO authenticated
  USING ((SELECT private.is_admin_user()))
  WITH CHECK ((SELECT private.is_admin_user()));

CREATE POLICY "Admin full access lesson_videos"
  ON public.lesson_videos FOR ALL
  TO authenticated
  USING ((SELECT private.is_admin_user()))
  WITH CHECK ((SELECT private.is_admin_user()));

CREATE POLICY "Admin full access user_course_enrollments_courses"
  ON public.user_course_enrollments_courses FOR ALL
  TO authenticated
  USING ((SELECT private.is_admin_user()))
  WITH CHECK ((SELECT private.is_admin_user()));

CREATE POLICY "Admin full access user_lesson_completions"
  ON public.user_lesson_completions FOR ALL
  TO authenticated
  USING ((SELECT private.is_admin_user()))
  WITH CHECK ((SELECT private.is_admin_user()));

CREATE POLICY "Admin full access course_announcements"
  ON public.course_announcements FOR ALL
  TO authenticated
  USING ((SELECT private.is_admin_user()))
  WITH CHECK ((SELECT private.is_admin_user()));

-- Enable realtime for courses platform tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_modules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_lessons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_course_enrollments_courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_lesson_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_announcements;

COMMIT;
