-- Manual repair script for support/admin login.
-- Run in Supabase SQL Editor if support@4sport.co.za cannot log in cleanly.
-- This keeps the account and repairs linked app rows.

UPDATE public.profiles
SET role = 'admin', email = lower(email)
WHERE lower(email) IN ('info@4sport.co.za', 'support@4sport.co.za');

DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE lower(email) IN ('info@4sport.co.za', 'support@4sport.co.za')
);

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE lower(email) IN ('info@4sport.co.za', 'support@4sport.co.za')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.reps
SET role = 'admin', active = true, invitation_status = 'accepted'
WHERE lower(email) IN ('info@4sport.co.za', 'support@4sport.co.za');

-- Verify result
SELECT
  au.email,
  p.role AS profile_role,
  ur.role AS user_role,
  r.role AS rep_role,
  r.active AS rep_active
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
LEFT JOIN public.reps r ON r.user_id = au.id
WHERE lower(au.email) IN ('info@4sport.co.za', 'support@4sport.co.za')
ORDER BY au.email;
