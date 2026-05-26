DO $$
BEGIN
  CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

INSERT INTO public.user_roles (user_id, role)
SELECT id, role
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = NEW.id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, NEW.role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_role_sync ON public.profiles;
CREATE TRIGGER trg_profiles_role_sync
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_to_user_roles();

ALTER TABLE public.reps
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invitation_status public.invitation_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_invite_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_reset_sent_at timestamptz;

UPDATE public.reps
SET profile_id = user_id
WHERE profile_id IS NULL
  AND user_id IS NOT NULL;

UPDATE public.reps
SET invitation_status = 'accepted'
WHERE user_id IS NOT NULL
  AND invitation_status = 'pending';

CREATE OR REPLACE FUNCTION public.sync_rep_user_profile_links()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.profile_id IS NULL THEN
    NEW.profile_id := NEW.user_id;
  ELSIF NEW.profile_id IS NOT NULL AND NEW.user_id IS NULL THEN
    NEW.user_id := NEW.profile_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reps_user_profile_sync ON public.reps;
CREATE TRIGGER trg_reps_user_profile_sync
BEFORE INSERT OR UPDATE OF user_id, profile_id ON public.reps
FOR EACH ROW EXECUTE FUNCTION public.sync_rep_user_profile_links();

CREATE TABLE IF NOT EXISTS public.account_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'sales_rep',
  rep_id uuid REFERENCES public.reps(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_account_invitations_upd ON public.account_invitations;
CREATE TRIGGER trg_account_invitations_upd
BEFORE UPDATE ON public.account_invitations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS user_roles_admin_read ON public.user_roles;
CREATE POLICY user_roles_admin_read ON public.user_roles
  FOR SELECT TO public
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

DROP POLICY IF EXISTS user_roles_admin_write ON public.user_roles;
CREATE POLICY user_roles_admin_write ON public.user_roles
  FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS account_invitations_admin_all ON public.account_invitations;
CREATE POLICY account_invitations_admin_all ON public.account_invitations
  FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_role_to_user_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_rep_user_profile_links() FROM PUBLIC, anon, authenticated;