ALTER TABLE public.marketing_orders
  ADD COLUMN IF NOT EXISTS viewed_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS marketing_orders_unread_pending_idx
  ON public.marketing_orders (created_at DESC)
  WHERE status = 'pending' AND viewed_at IS NULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_orders;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;