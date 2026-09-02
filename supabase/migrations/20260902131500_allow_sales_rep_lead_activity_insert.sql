-- Allow assigned sales representatives to log activity against their own leads.
-- Call-centre agents retain their existing, stricter agent_id-based policy.

DROP POLICY IF EXISTS lead_activity_rep_insert ON public.lead_activity;
CREATE POLICY lead_activity_rep_insert
ON public.lead_activity
FOR INSERT TO public
WITH CHECK (
  agent_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = lead_activity.lead_id
      AND l.assigned_rep_id = public.current_rep_id()
  )
);
