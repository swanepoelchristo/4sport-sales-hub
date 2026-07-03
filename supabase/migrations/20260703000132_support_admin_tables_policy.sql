-- Add support access without removing existing admin policies.

CREATE POLICY profiles_support_update ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(),'support'));

CREATE POLICY profiles_support_insert ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'support'));

CREATE POLICY user_roles_support_read ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(),'support'));

CREATE POLICY account_invitations_support_all ON public.account_invitations FOR ALL
  USING (public.has_role(auth.uid(),'support'))
  WITH CHECK (public.has_role(auth.uid(),'support'));

CREATE POLICY call_center_agents_support_all ON public.call_center_agents FOR ALL
  USING (public.has_role(auth.uid(),'support'))
  WITH CHECK (public.has_role(auth.uid(),'support'));

CREATE POLICY lead_activity_support_all ON public.lead_activity FOR ALL
  USING (public.has_role(auth.uid(),'support'))
  WITH CHECK (public.has_role(auth.uid(),'support'));
