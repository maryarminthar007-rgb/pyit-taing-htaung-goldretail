ALTER TABLE public.marketing_orders
  ADD COLUMN order_kind text NOT NULL DEFAULT 'shop_reorder',
  ADD COLUMN item_category text;

ALTER TABLE public.marketing_orders
  ADD CONSTRAINT marketing_orders_order_kind_check
  CHECK (order_kind IN ('shop_reorder', 'custom_sample'));

CREATE INDEX marketing_orders_order_kind_idx
  ON public.marketing_orders (order_kind, created_at DESC);