ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS item_classification text
  CHECK (item_classification IN ('shop','order'));

ALTER TABLE public.marketing_orders
  ADD COLUMN IF NOT EXISTS item_classification text
  CHECK (item_classification IN ('shop','order'));