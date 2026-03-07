-- Applied migration name: enable_test_blocks_realtime_publication
-- Date: 2026-03-08

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'test_blocks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.test_blocks;
  END IF;
END
$$;
