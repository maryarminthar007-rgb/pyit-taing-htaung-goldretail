ALTER TABLE public.goldsmiths ADD COLUMN IF NOT EXISTS symbol text;
CREATE INDEX IF NOT EXISTS idx_goldsmiths_symbol ON public.goldsmiths (symbol);