-- Applied migration name: add_external_ids_and_foreign_key_indexes
-- Date: 2026-02-13

alter table public.questions add column if not exists external_id text;
alter table public.test_blocks add column if not exists external_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'questions_external_id_unique'
  ) THEN
    ALTER TABLE public.questions ADD CONSTRAINT questions_external_id_unique UNIQUE (external_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'test_blocks_external_id_unique'
  ) THEN
    ALTER TABLE public.test_blocks ADD CONSTRAINT test_blocks_external_id_unique UNIQUE (external_id);
  END IF;
END
$$;

create index if not exists idx_questions_author_id on public.questions(author_id);
create index if not exists idx_questions_topic_id on public.questions(topic_id);
create index if not exists idx_test_blocks_course_id on public.test_blocks(course_id);
