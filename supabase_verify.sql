-- Supabase verification checks for O6U MedBank schema + sync table.
-- Run in Supabase SQL editor after setup scripts.

BEGIN;

-- 1) Core tables exist
SELECT to_regclass('public.users')              AS users_table;
SELECT to_regclass('public.courses')            AS courses_table;
SELECT to_regclass('public.course_topics')      AS course_topics_table;
SELECT to_regclass('public.questions')          AS questions_table;
SELECT to_regclass('public.question_choices')   AS question_choices_table;
SELECT to_regclass('public.test_blocks')        AS test_blocks_table;
SELECT to_regclass('public.test_responses')     AS test_responses_table;
SELECT to_regclass('public.app_state')          AS app_state_table;

-- 2) Basic seed sanity
SELECT COUNT(*) AS users_count FROM public.users;
SELECT COUNT(*) AS courses_count FROM public.courses;
SELECT COUNT(*) AS topics_count FROM public.course_topics;

-- 3) Prototype sync sanity (write + read + cleanup in transaction)
INSERT INTO public.app_state (storage_key, payload, updated_at)
VALUES ('__sync_probe__', '{"ok":true}'::jsonb, NOW())
ON CONFLICT (storage_key) DO UPDATE
SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at;

SELECT storage_key, payload
FROM public.app_state
WHERE storage_key = '__sync_probe__';

ROLLBACK;
