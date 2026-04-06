-- Protect student history tables from client-side bulk deletion.
-- Student clients may insert/update their own attempts and answers,
-- but only admins (or service_role bypass) may delete persisted rows.

DROP POLICY IF EXISTS blocks_delete ON public.test_blocks;
CREATE POLICY blocks_delete
ON public.test_blocks
FOR DELETE
TO authenticated
USING (public.is_admin_user());

DROP POLICY IF EXISTS items_write ON public.test_block_items;
DROP POLICY IF EXISTS items_insert ON public.test_block_items;
DROP POLICY IF EXISTS items_update ON public.test_block_items;
DROP POLICY IF EXISTS items_delete ON public.test_block_items;

CREATE POLICY items_insert
ON public.test_block_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.test_blocks b
    WHERE b.id = test_block_items.block_id
      AND (b.user_id = auth.uid() OR public.is_admin_user())
  )
);

CREATE POLICY items_update
ON public.test_block_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.test_blocks b
    WHERE b.id = test_block_items.block_id
      AND (b.user_id = auth.uid() OR public.is_admin_user())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.test_blocks b
    WHERE b.id = test_block_items.block_id
      AND (b.user_id = auth.uid() OR public.is_admin_user())
  )
);

CREATE POLICY items_delete
ON public.test_block_items
FOR DELETE
TO authenticated
USING (public.is_admin_user());

DROP POLICY IF EXISTS responses_write ON public.test_responses;
DROP POLICY IF EXISTS responses_insert ON public.test_responses;
DROP POLICY IF EXISTS responses_update ON public.test_responses;
DROP POLICY IF EXISTS responses_delete ON public.test_responses;

CREATE POLICY responses_insert
ON public.test_responses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.test_blocks b
    WHERE b.id = test_responses.block_id
      AND (b.user_id = auth.uid() OR public.is_admin_user())
  )
);

CREATE POLICY responses_update
ON public.test_responses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.test_blocks b
    WHERE b.id = test_responses.block_id
      AND (b.user_id = auth.uid() OR public.is_admin_user())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.test_blocks b
    WHERE b.id = test_responses.block_id
      AND (b.user_id = auth.uid() OR public.is_admin_user())
  )
);

CREATE POLICY responses_delete
ON public.test_responses
FOR DELETE
TO authenticated
USING (public.is_admin_user());
