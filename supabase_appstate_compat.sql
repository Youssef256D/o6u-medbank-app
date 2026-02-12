-- Supabase compatibility migration for app-state sync table naming.
-- Handles both legacy: public.appstate(storagekey) and canonical: public.app_state(storage_key).
-- Safe to run multiple times.

BEGIN;

-- If only legacy table exists, rename it to canonical table name.
DO $$
BEGIN
  IF to_regclass('public.appstate') IS NOT NULL
     AND to_regclass('public.app_state') IS NULL THEN
    ALTER TABLE public.appstate RENAME TO app_state;
  END IF;
END $$;

-- Ensure canonical table exists.
CREATE TABLE IF NOT EXISTS public.app_state (
  storage_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If a legacy column name still exists, rename it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_state'
      AND column_name = 'storagekey'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_state'
      AND column_name = 'storage_key'
  ) THEN
    ALTER TABLE public.app_state RENAME COLUMN storagekey TO storage_key;
  END IF;
END $$;

-- If both tables exist, merge legacy rows into canonical and keep canonical as source of truth.
DO $$
BEGIN
  IF to_regclass('public.appstate') IS NOT NULL
     AND to_regclass('public.app_state') IS NOT NULL
     AND to_regclass('public.appstate') <> to_regclass('public.app_state') THEN
    INSERT INTO public.app_state (storage_key, payload, updated_at)
    SELECT a.storagekey, a.payload, COALESCE(a.updated_at, NOW())
    FROM public.appstate a
    ON CONFLICT (storage_key) DO UPDATE
    SET
      payload = EXCLUDED.payload,
      updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS app_state_updated_at_idx ON public.app_state (updated_at DESC);

ALTER TABLE public.app_state DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_state TO anon, authenticated;

COMMIT;
