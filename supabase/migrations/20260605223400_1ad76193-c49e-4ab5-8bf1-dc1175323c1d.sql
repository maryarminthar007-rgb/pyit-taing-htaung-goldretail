
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved'));

UPDATE public.profiles SET status = 'approved' WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count int;
  is_super boolean;
BEGIN
  is_super := lower(NEW.email) = 'kyoukpe@gmail.com';

  INSERT INTO public.profiles (id, email, display_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN is_super THEN 'approved' ELSE 'pending' END
  );

  IF is_super THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  ELSE
    SELECT count(*) INTO user_count FROM public.user_roles WHERE role = 'super_admin';
    IF user_count = 0 THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
      ON CONFLICT DO NOTHING;
      UPDATE public.profiles SET status = 'approved' WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
