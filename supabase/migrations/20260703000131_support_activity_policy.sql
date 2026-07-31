-- Allow support users to read activity logs.

CREATE POLICY activity_support_select ON public.activity_logs FOR SELECT
  USING (public.has_role(auth.uid(),'support'));
