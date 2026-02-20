-- Applied migration name: add_question_media_columns
-- Date: 2026-02-20

alter table public.questions add column if not exists question_image_url text;
alter table public.questions add column if not exists explanation_image_url text;
