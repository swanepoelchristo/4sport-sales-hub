-- Clean back-office operating model.
-- Both back-office accounts use the existing admin role.

UPDATE public.profiles
SET role = 'admin'
WHERE lower(email) IN ('info@4sport.co.za', 'support@4sport.co.za');

DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id
  FROM auth.users
  WHERE lower(email) IN ('info@4sport.co.za', 'support@4sport.co.za')
);

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE lower(email) IN ('info@4sport.co.za', 'support@4sport.co.za')
ON CONFLICT DO NOTHING;

UPDATE public.reps
SET role = 'admin', active = true, invitation_status = 'accepted'
WHERE lower(email) IN ('info@4sport.co.za', 'support@4sport.co.za');
