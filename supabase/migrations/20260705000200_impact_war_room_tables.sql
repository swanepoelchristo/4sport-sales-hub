-- 4SPORT Impact War Room MVP tables.
-- Safe first slice: tracks tournament proof, school funding status, funders, and document readiness.

CREATE TABLE IF NOT EXISTS public.impact_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport text NOT NULL DEFAULT 'Hockey',
  venue text NOT NULL DEFAULT '',
  start_date date,
  end_date date,
  schools_count integer NOT NULL DEFAULT 0,
  matches_count integer NOT NULL DEFAULT 0,
  reports_generated integer NOT NULL DEFAULT 0,
  reports_sent integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Planning',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.impact_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  province text NOT NULL DEFAULT '',
  school_type text NOT NULL DEFAULT 'Primary',
  contact_person text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  sport_codes text[] NOT NULL DEFAULT '{}',
  funding_status text NOT NULL DEFAULT 'Needs Funding',
  onboarding_status text NOT NULL DEFAULT 'Not Started',
  report_sent boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.impact_funding_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  opportunity_type text NOT NULL DEFAULT 'Foundation',
  country text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  funding_size text NOT NULL DEFAULT '',
  deadline date,
  eligibility text NOT NULL DEFAULT '',
  fit_score integer NOT NULL DEFAULT 3 CHECK (fit_score >= 1 AND fit_score <= 5),
  status text NOT NULL DEFAULT 'Researching',
  next_action text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.impact_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name text NOT NULL,
  document_type text NOT NULL DEFAULT 'Investor Pack',
  status text NOT NULL DEFAULT 'Needed',
  owner text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.impact_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_funding_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY impact_tournaments_admin_all ON public.impact_tournaments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY impact_schools_admin_all ON public.impact_schools FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY impact_funding_opportunities_admin_all ON public.impact_funding_opportunities FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY impact_documents_admin_all ON public.impact_documents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.impact_tournaments (
  name, sport, venue, schools_count, reports_generated, reports_sent, status, notes
)
VALUES (
  'Primary Schools Hockey Tournament',
  'Hockey',
  'Launch venue to confirm',
  53,
  53,
  53,
  'Launch week',
  'Initial Game Day Tech Table proof event: 53 schools using reports during Monday to Thursday tournament.'
)
ON CONFLICT DO NOTHING;
