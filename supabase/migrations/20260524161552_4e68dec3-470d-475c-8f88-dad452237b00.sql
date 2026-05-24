-- profiles: drop overly-permissive SELECT, replace with self + super admin
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super admin can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- goldsmiths: restrict SELECT to admins (contains PII: phone, address)
DROP POLICY IF EXISTS "View goldsmiths" ON public.goldsmiths;

CREATE POLICY "Admins can view goldsmiths"
  ON public.goldsmiths FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- user_roles: users see only their own role; super admins see all
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.user_roles;

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admin can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));