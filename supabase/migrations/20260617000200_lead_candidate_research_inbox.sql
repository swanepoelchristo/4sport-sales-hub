-- PR #7: Lead candidate research inbox
-- Purpose:
-- - Internet/open-source/public info must NOT go straight into public.leads.
-- - Public information first lands in lead_candidates.
-- - It must be checked, double checked, and human-approved before becoming a real lead.
--
-- Safety rule:
-- - Only public organisation/admin/business contact information.
-- - No child, athlete, guardian, private, hidden, leaked, or questionable personal data.

CREATE TABLE IF NOT EXISTS public.lead_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  org_name text NOT NULL DEFAULT '',
  org_type public.org_type NOT NULL DEFAULT 'School',
  province text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  sport_focus text NOT NULL DEFAULT '',

  contact_person text NOT NULL DEFAULT '',
  contact_role text NOT NULL DEFAULT '',
  public_phone text NOT NULL DEFAULT '',
  public_email text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',

  source_url_1 text NOT NULL DEFAULT '',
  source_url_2 text NOT NULL DEFAULT '',
  source_url_3 text NOT NULL DEFAULT '',
  source_note text NOT NULL DEFAULT '',

  verification_status text NOT NULL DEFAULT 'draft'
    CHECK (
      verification_status IN (
        'draft',
        'needs_check',
        'checked_once',
        'checked_twice',
        'approved',
        'rejected',
        'converted'
      )
    ),

  check_1_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  check_1_at timestamptz,
  check_1_note text NOT NULL DEFAULT '',

  check_2_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  check_2_at timestamptz,
  check_2_note text NOT NULL DEFAULT '',

  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,

  rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  rejected_reason text NOT NULL DEFAULT '',

  converted_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_candidates_status
  ON public.lead_candidates(verification_status);

CREATE INDEX IF NOT EXISTS idx_lead_candidates_created_at
  ON public.lead_candidates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_candidates_org_name
  ON public.lead_candidates(org_name);

DROP TRIGGER IF EXISTS trg_lead_candidates_upd ON public.lead_candidates;
CREATE TRIGGER trg_lead_candidates_upd
BEFORE UPDATE ON public.lead_candidates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lead_candidates ENABLE ROW LEVEL SECURITY;

-- Admin can do everything.
DROP POLICY IF EXISTS lead_candidates_admin_all ON public.lead_candidates;
CREATE POLICY lead_candidates_admin_all
ON public.lead_candidates
FOR ALL TO public
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Active call centre agents can read candidates for review.
DROP POLICY IF EXISTS lead_candidates_call_center_select ON public.lead_candidates;
CREATE POLICY lead_candidates_call_center_select
ON public.lead_candidates
FOR SELECT TO public
USING (public.is_active_call_center_agent());

-- Active call centre agents can add candidates, but not auto-approve as final lead.
DROP POLICY IF EXISTS lead_candidates_call_center_insert ON public.lead_candidates;
CREATE POLICY lead_candidates_call_center_insert
ON public.lead_candidates
FOR INSERT TO public
WITH CHECK (
  public.is_active_call_center_agent()
  AND verification_status IN ('draft', 'needs_check')
);

-- Active call centre agents can update review fields, but final approval remains admin-controlled by app UI.
DROP POLICY IF EXISTS lead_candidates_call_center_update ON public.lead_candidates;
CREATE POLICY lead_candidates_call_center_update
ON public.lead_candidates
FOR UPDATE TO public
USING (
  public.is_active_call_center_agent()
  AND verification_status IN ('draft', 'needs_check', 'checked_once', 'checked_twice')
)
WITH CHECK (
  public.is_active_call_center_agent()
  AND verification_status IN ('draft', 'needs_check', 'checked_once', 'checked_twice', 'rejected')
);

GRANT SELECT, INSERT, UPDATE ON public.lead_candidates TO authenticated;
GRANT ALL ON public.lead_candidates TO service_role;
