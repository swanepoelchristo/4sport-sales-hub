# Admin/support login rectification

Correct access model:

- Marianne: `info@4sports.co.za`, role `admin`, full access.
- Christo/support: `support@4sports.co.za`, role `support`, full access equal to admin.
- Sales reps: role `sales_rep`, limited to their own pipeline.
- Call centre agents: role `call_center_agent`, limited to call-centre/research workflows.

Implementation notes:

1. Add `support` to the application role model.
2. Treat `admin` and `support` as back-office/full-access roles in UI route guards.
3. Treat `admin` and `support` as back-office/full-access roles in Supabase RLS.
4. Bootstrap or repair the two back-office accounts so the email, profile row, user_roles row, and reps row agree.
5. Keep sales reps and call-centre agents constrained by their existing RLS policies.

Important: do not weaken sales rep or call-centre access to solve the admin login issue.
