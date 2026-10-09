CREATE TABLE public.office_gold_stock (
  quality_group text PRIMARY KEY CHECK (quality_group IN ('A', 'B', 'C')),
  available_grams numeric NOT NULL DEFAULT 0 CHECK (available_grams >= 0 AND available_grams <> 'NaN'::numeric AND available_grams <> 'Infinity'::numeric),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.office_gold_stock TO authenticated;
GRANT ALL ON public.office_gold_stock TO service_role;
ALTER TABLE public.office_gold_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view office stock" ON public.office_gold_stock FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins add office stock" ON public.office_gold_stock FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update office stock" ON public.office_gold_stock FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE OR REPLACE FUNCTION public.update_office_gold_stock(p_group text, p_grams numeric, p_mode text)
RETURNS numeric LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE result numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_group IS NULL OR p_group NOT IN ('A','B','C') OR p_mode IS NULL OR p_mode NOT IN ('add','set') OR p_grams IS NULL OR p_grams < 0 OR p_grams IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) THEN
    RAISE EXCEPTION 'Invalid stock input' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.office_gold_stock(quality_group, available_grams)
  VALUES (p_group, p_grams)
  ON CONFLICT (quality_group) DO UPDATE SET
    available_grams = CASE WHEN p_mode = 'add' THEN office_gold_stock.available_grams + EXCLUDED.available_grams ELSE EXCLUDED.available_grams END,
    updated_at = now()
  RETURNING available_grams INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.update_office_gold_stock(text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_office_gold_stock(text,numeric,text) TO authenticated;