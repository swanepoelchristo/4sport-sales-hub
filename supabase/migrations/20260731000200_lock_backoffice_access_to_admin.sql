-- Final back-office access model.
-- Marianne and Christo both use the existing admin role.
-- Keep this as a follow-up migration instead of rewriting historical migrations.

CREATE OR REPLACE FUNCTION public.has_backoffice_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'admin'
  );
$$;
