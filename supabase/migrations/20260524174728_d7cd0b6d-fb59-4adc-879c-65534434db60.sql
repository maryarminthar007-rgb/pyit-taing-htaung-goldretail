-- Permanent backend override for the owner account.
-- This function checks the authenticated user's email server-side so database rules
-- cannot downgrade kyoukpe@gmail.com even if user_roles is reset.
CREATE OR REPLACE FUNCTION public.is_ultimate_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) = 'kyoukpe@gmail.com'
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND lower(p.email) = 'kyoukpe@gmail.com'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _role = 'super_admin'::public.app_role
      AND public.is_ultimate_super_admin(_user_id)
    THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_ultimate_super_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role IN ('super_admin', 'limited_admin')
    )
$$;

-- Keep the persisted role corrected for the existing owner account.
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid
  FROM public.profiles
  WHERE lower(email) = 'kyoukpe@gmail.com'
  LIMIT 1;

  IF v_uid IS NULL THEN
    SELECT id INTO v_uid
    FROM auth.users
    WHERE lower(email) = 'kyoukpe@gmail.com'
    LIMIT 1;
  END IF;

  IF v_uid IS NOT NULL THEN
    DELETE FROM public.user_roles
    WHERE user_id = v_uid
      AND role <> 'super_admin'::public.app_role;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'super_admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.is_ultimate_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;