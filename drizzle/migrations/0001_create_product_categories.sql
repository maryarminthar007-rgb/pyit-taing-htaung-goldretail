CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  quality_group text NOT NULL DEFAULT 'A' CHECK (quality_group IN ('A','B','C')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View product categories" ON public.product_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert product categories" ON public.product_categories
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update product categories" ON public.product_categories
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admin delete product categories" ON public.product_categories
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));
