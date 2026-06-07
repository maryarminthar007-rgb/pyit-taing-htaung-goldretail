ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS scrap_gold numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stone_setting_wastage numeric DEFAULT 0;