-- Repair 4SPORT back-office account roles.
-- Both back-office accounts use the existing admin role.

UPDATE public.profiles
SET role = 'admin'
WHERE lower(email) IN ('info@4sport.co.za', 'support@4sport.co.za');

UPDATE public.user_roles
SET role = 'admin'
WHERE user_id IN (
  SELECT id
  FROM auth.users
  WHERE lower(email) IN ('info@4sport.co.za', 'support@4sport.co.za')
);

UPDATE public.reps
SET role = 'admin', active = true, invitation_status = 'accepted'
WHERE lower(email) IN ('info@4sport.co.za', 'support@4sport.co.za');
