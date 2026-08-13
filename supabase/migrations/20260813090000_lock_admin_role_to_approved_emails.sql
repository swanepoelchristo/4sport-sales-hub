-- Lock administrator authority to the three approved 4SPORT identities.
-- This is enforced against auth.users.email, not mutable profile metadata.

CREATE OR REPLACE FUNCTION public.is_approved_admin_email(_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(trim(COALESCE(_email, ''))) = ANY (ARRAY[
    'swanepoelchristo00@gmail.com',
    'support@4sport.co.za',
    'info@4sport.co.za'
  ]);
$$;

CREATE OR REPLACE FUNCTION public.enforce_approved_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_user_id uuid;
  target_email text;
BEGIN
  IF TG_TABLE_NAME = 'account_invitations' THEN
    target_email := NEW.email;
  ELSE
    target_user_id := CASE
      WHEN TG_TABLE_NAME = 'profiles' THEN NEW.id
      ELSE NEW.user_id
    END;

    SELECT email
      INTO target_email
      FROM auth.users
     WHERE id = target_user_id;
  END IF;

  IF NEW.role::text = 'admin' THEN

    IF target_email IS NULL OR NOT public.is_approved_admin_email(target_email) THEN
      RAISE EXCEPTION 'Administrator access is restricted to approved 4SPORT accounts'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profiles_admin_allowlist ON public.profiles;
CREATE TRIGGER enforce_profiles_admin_allowlist
BEFORE INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_approved_admin_role();

DROP TRIGGER IF EXISTS enforce_user_roles_admin_allowlist ON public.user_roles;
CREATE TRIGGER enforce_user_roles_admin_allowlist
BEFORE INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_approved_admin_role();

DROP TRIGGER IF EXISTS enforce_reps_admin_allowlist ON public.reps;
CREATE TRIGGER enforce_reps_admin_allowlist
BEFORE INSERT OR UPDATE OF role ON public.reps
FOR EACH ROW EXECUTE FUNCTION public.enforce_approved_admin_role();

DROP TRIGGER IF EXISTS enforce_account_invitations_admin_allowlist ON public.account_invitations;
CREATE TRIGGER enforce_account_invitations_admin_allowlist
BEFORE INSERT OR UPDATE OF email, role ON public.account_invitations
FOR EACH ROW EXECUTE FUNCTION public.enforce_approved_admin_role();

CREATE OR REPLACE FUNCTION public.prevent_admin_identity_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF lower(COALESCE(NEW.email, '')) IS DISTINCT FROM lower(COALESCE(OLD.email, ''))
     AND EXISTS (
       SELECT 1
       FROM public.user_roles
       WHERE user_id = OLD.id
         AND role::text = 'admin'
     )
     AND NOT public.is_approved_admin_email(NEW.email)
  THEN
    RAISE EXCEPTION 'An administrator login email must remain an approved 4SPORT identity'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_admin_email_change ON auth.users;
CREATE TRIGGER prevent_admin_email_change
BEFORE UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_identity_email_change();

-- A public signup must never be able to choose its own privileged role through metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'sales_rep'::public.app_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Remove pre-existing admin assignments from every identity outside the allowlist.
DELETE FROM public.user_roles ur
USING auth.users u
WHERE ur.user_id = u.id
  AND ur.role::text = 'admin'
  AND NOT public.is_approved_admin_email(u.email);

UPDATE public.profiles p
SET role = 'sales_rep'::public.app_role
FROM auth.users u
WHERE p.id = u.id
  AND p.role::text = 'admin'
  AND NOT public.is_approved_admin_email(u.email);

UPDATE public.reps r
SET role = 'sales_rep'::public.app_role
FROM auth.users u
WHERE r.user_id = u.id
  AND r.role::text = 'admin'
  AND NOT public.is_approved_admin_email(u.email);

UPDATE public.account_invitations
SET role = 'sales_rep'::public.app_role
WHERE role::text = 'admin'
  AND NOT public.is_approved_admin_email(email);

REVOKE EXECUTE ON FUNCTION public.is_approved_admin_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_approved_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_admin_identity_email_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
