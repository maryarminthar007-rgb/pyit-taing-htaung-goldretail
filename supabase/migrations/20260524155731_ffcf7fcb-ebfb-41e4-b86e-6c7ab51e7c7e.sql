
-- =========================================================
-- Roles & profiles
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'limited_admin', 'viewer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'limited_admin')
  )
$$;

-- New-user trigger: create profile and assign role.
-- First user ever = super_admin; rest = viewer.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles policies
CREATE POLICY "Authenticated can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Super admin manages profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- user_roles policies
CREATE POLICY "Authenticated can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- Tighten existing tables
-- =========================================================
DROP POLICY IF EXISTS "public all" ON public.goldsmiths;
DROP POLICY IF EXISTS "public all" ON public.books;
DROP POLICY IF EXISTS "public all" ON public.orders;
DROP POLICY IF EXISTS "public all" ON public.products;

-- Goldsmiths: add work_status
ALTER TABLE public.goldsmiths
  ADD COLUMN work_status text NOT NULL DEFAULT 'available'
  CHECK (work_status IN ('available', 'busy'));

CREATE POLICY "View goldsmiths" ON public.goldsmiths
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert goldsmiths" ON public.goldsmiths
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update goldsmiths" ON public.goldsmiths
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admin delete goldsmiths" ON public.goldsmiths
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "View books" ON public.books
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert books" ON public.books
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update books" ON public.books
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admin delete books" ON public.books
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "View orders" ON public.orders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admin delete orders" ON public.orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "View products" ON public.products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update products" ON public.products
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admin delete products" ON public.products
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- Gemstones ledger
-- =========================================================
CREATE TYPE public.gemstone_weight_unit AS ENUM ('carat', 'rati', 'gram');

CREATE TABLE public.gemstones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  entry_date date NOT NULL DEFAULT current_date,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  job_reference text,
  gemstone_name text NOT NULL,
  gemstone_type text,
  weight numeric NOT NULL DEFAULT 0,
  weight_unit public.gemstone_weight_unit NOT NULL DEFAULT 'carat',
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  setting_fee numeric NOT NULL DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (COALESCE(quantity,0) * COALESCE(unit_cost,0) + COALESCE(setting_fee,0)) STORED,
  supplier text,
  notes text
);
ALTER TABLE public.gemstones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View gemstones" ON public.gemstones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert gemstones" ON public.gemstones
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update gemstones" ON public.gemstones
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admin delete gemstones" ON public.gemstones
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_gemstones_order ON public.gemstones(order_id);
CREATE INDEX idx_gemstones_date ON public.gemstones(entry_date DESC);
