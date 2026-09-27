ALTER TABLE public.goldsmiths
  ADD COLUMN IF NOT EXISTS quality_groups text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deposit_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS deposit_gold_g numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_cash numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_gold_rate numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quality_group text;