DROP TRIGGER IF EXISTS trg_profiles_role_sync ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_profile_role_to_user_roles();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desired_role public.app_role;
BEGIN
  desired_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role','')::public.app_role, 'sales_rep');

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, desired_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END $$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;