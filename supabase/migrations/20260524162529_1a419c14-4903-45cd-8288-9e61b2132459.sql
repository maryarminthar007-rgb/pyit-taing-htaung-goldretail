
-- Fix: authenticated role couldn't execute helper functions used in RLS
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Ensure kyoukpe@gmail.com gets super_admin role (in case account predates the trigger update)
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'kyoukpe@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    -- Remove any non-super_admin roles for this user
    DELETE FROM public.user_roles WHERE user_id = v_uid AND role <> 'super_admin';
    -- Insert super_admin role if not already present
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'super_admin')
    ON CONFLICT DO NOTHING;
    -- Make sure a profile row exists too
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (v_uid, 'kyoukpe@gmail.com', 'kyoukpe@gmail.com')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
