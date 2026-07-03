-- Allow admin and support to use the same back-office policies.
-- Sales rep and call-centre policies remain unchanged.

DROP POLICY IF EXISTS reps_admin_all ON public.reps;
DROP POLICY IF EXISTS reps_backoffice_all ON public.reps;
CREATE POLICY reps_backoffice_all ON public.reps FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));

DROP POLICY IF EXISTS leads_admin_all ON public.leads;
DROP POLICY IF EXISTS leads_backoffice_all ON public.leads;
CREATE POLICY leads_backoffice_all ON public.leads FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));

DROP POLICY IF EXISTS meetings_admin_all ON public.meetings;
DROP POLICY IF EXISTS meetings_backoffice_all ON public.meetings;
CREATE POLICY meetings_backoffice_all ON public.meetings FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));

DROP POLICY IF EXISTS signups_admin_all ON public.signups;
DROP POLICY IF EXISTS signups_backoffice_all ON public.signups;
CREATE POLICY signups_backoffice_all ON public.signups FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
