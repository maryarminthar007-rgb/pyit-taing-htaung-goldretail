
CREATE TABLE IF NOT EXISTS public.marketing_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View marketing teams" ON public.marketing_teams
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage marketing teams" ON public.marketing_teams
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.marketing_teams (name) VALUES
  ('Team A'), ('Team B'), ('Team C')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.marketing_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.marketing_teams(id) ON DELETE SET NULL,
  team_name text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_photo_url text,
  qty numeric NOT NULL,
  specs text,
  order_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','completed','cancelled')),
  assigned_goldsmith_id uuid REFERENCES public.goldsmiths(id) ON DELETE SET NULL,
  assigned_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_orders_status ON public.marketing_orders(status);
CREATE INDEX IF NOT EXISTS idx_marketing_orders_created ON public.marketing_orders(created_at DESC);

ALTER TABLE public.marketing_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View marketing orders" ON public.marketing_orders
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'marketing'::public.app_role)
  );

CREATE POLICY "Create marketing orders" ON public.marketing_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'marketing'::public.app_role)
  );

CREATE POLICY "Admins update marketing orders" ON public.marketing_orders
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admin delete marketing orders" ON public.marketing_orders
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_orders_updated ON public.marketing_orders;
CREATE TRIGGER trg_marketing_orders_updated
  BEFORE UPDATE ON public.marketing_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
