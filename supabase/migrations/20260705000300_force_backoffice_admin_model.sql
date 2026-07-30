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

-- Repair an existing rep row that is present by email but is not linked to auth/profile.
UPDATE public.reps AS r
SET
  user_id = u.id,
  profile_id = u.id,
  role = 'admin',
  active = true,
  invitation_status = 'accepted'
FROM auth.users AS u
WHERE lower(r.email) = lower(u.email)
  AND lower(u.email) IN ('info@4sport.co.za', 'support@4sport.co.za');

-- A back-office auth/profile account may exist without any reps row at all.
-- Create that missing row so profile resolution and internal account IDs remain consistent.
INSERT INTO public.reps (
  user_id,
  profile_id,
  full_name,
  email,
  role,
  active,
  invitation_status
)
SELECT
  u.id,
  u.id,
  CASE lower(u.email)
    WHEN 'info@4sport.co.za' THEN 'Marianne'
    WHEN 'support@4sport.co.za' THEN 'Christo'
    ELSE COALESCE(NULLIF(p.full_name, ''), u.email)
  END,
  lower(u.email),
  'admin',
  true,
  'accepted'
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE lower(u.email) IN ('info@4sport.co.za', 'support@4sport.co.za')
  AND NOT EXISTS (
    SELECT 1
    FROM public.reps AS r
    WHERE r.user_id = u.id
       OR lower(r.email) = lower(u.email)
  );

UPDATE public.reps
SET role = 'admin', active = true, invitation_status = 'accepted'
WHERE lower(email) IN ('info@4sport.co.za', 'support@4sport.co.za');
