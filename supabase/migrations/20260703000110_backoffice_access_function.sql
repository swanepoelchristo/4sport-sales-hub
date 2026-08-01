-- Shared back-office helper for admin + support access checks.

CREATE OR REPLACE FUNCTION public.has_backoffice_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'support')
  );
$$;
