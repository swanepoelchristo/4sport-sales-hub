
-- ============ Enums ============
CREATE TYPE public.app_role AS ENUM ('admin', 'sales_rep');
CREATE TYPE public.lead_status AS ENUM (
  'New Lead','Contacted','Meeting Scheduled','Pitched','Interested',
  'Not Interested','Signed','Paid','Active','Lost'
);
CREATE TYPE public.org_type AS ENUM ('School','Club','Academy','Other');
CREATE TYPE public.meeting_type AS ENUM ('Phone','WhatsApp','Online','In-person');
CREATE TYPE public.meeting_status AS ENUM ('Scheduled','Completed','Cancelled','Rescheduled');
CREATE TYPE public.commission_year AS ENUM (
  '1st year','2nd consecutive year','3rd consecutive year',
  '4th consecutive year','5th year+'
);
CREATE TYPE public.commission_payment_status AS ENUM ('Pending','Approved','Paid','Rejected');

-- ============ Tables ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'sales_rep',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  sport_focus text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'sales_rep',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name text NOT NULL,
  org_type public.org_type NOT NULL DEFAULT 'School',
  province text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  sport_focus text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  contact_role text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  lead_source text NOT NULL DEFAULT '',
  assigned_rep_id uuid REFERENCES public.reps(id) ON DELETE SET NULL,
  status public.lead_status NOT NULL DEFAULT 'New Lead',
  notes text NOT NULL DEFAULT '',
  next_follow_up timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  rep_id uuid REFERENCES public.reps(id) ON DELETE SET NULL,
  meeting_at timestamptz NOT NULL,
  meeting_type public.meeting_type NOT NULL DEFAULT 'In-person',
  status public.meeting_status NOT NULL DEFAULT 'Scheduled',
  outcome_notes text NOT NULL DEFAULT '',
  next_action text NOT NULL DEFAULT '',
  next_follow_up timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  rep_id uuid REFERENCES public.reps(id) ON DELETE SET NULL,
  signed_date timestamptz NOT NULL DEFAULT now(),
  paid boolean NOT NULL DEFAULT false,
  payment_date timestamptz,
  active_teams int NOT NULL DEFAULT 0,
  paying_users_active boolean NOT NULL DEFAULT false,
  commission_year public.commission_year NOT NULL DEFAULT '1st year',
  commission_payment_status public.commission_payment_status NOT NULL DEFAULT 'Pending',
  admin_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_id uuid NOT NULL REFERENCES public.signups(id) ON DELETE CASCADE,
  rep_id uuid REFERENCES public.reps(id) ON DELETE SET NULL,
  commission_year public.commission_year NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  qualified boolean NOT NULL DEFAULT false,
  status public.commission_payment_status NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ Helper functions (SECURITY DEFINER) ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_rep_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.reps WHERE user_id = auth.uid() LIMIT 1;
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reps_upd BEFORE UPDATE ON public.reps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_leads_upd BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_meetings_upd BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_signups_upd BEFORE UPDATE ON public.signups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_commissions_upd BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role','')::public.app_role, 'sales_rep')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ Enable RLS ============
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_self_or_admin_read" ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_admin_write" ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- reps
CREATE POLICY "reps_admin_all" ON public.reps FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "reps_self_read" ON public.reps FOR SELECT
  USING (user_id = auth.uid());

-- leads
CREATE POLICY "leads_admin_all" ON public.leads FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "leads_rep_select" ON public.leads FOR SELECT
  USING (assigned_rep_id = public.current_rep_id());
CREATE POLICY "leads_rep_insert" ON public.leads FOR INSERT
  WITH CHECK (assigned_rep_id = public.current_rep_id());
CREATE POLICY "leads_rep_update" ON public.leads FOR UPDATE
  USING (assigned_rep_id = public.current_rep_id())
  WITH CHECK (assigned_rep_id = public.current_rep_id());
CREATE POLICY "leads_rep_delete" ON public.leads FOR DELETE
  USING (assigned_rep_id = public.current_rep_id());

-- meetings
CREATE POLICY "meetings_admin_all" ON public.meetings FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "meetings_rep_select" ON public.meetings FOR SELECT
  USING (rep_id = public.current_rep_id());
CREATE POLICY "meetings_rep_insert" ON public.meetings FOR INSERT
  WITH CHECK (rep_id = public.current_rep_id());
CREATE POLICY "meetings_rep_update" ON public.meetings FOR UPDATE
  USING (rep_id = public.current_rep_id())
  WITH CHECK (rep_id = public.current_rep_id());
CREATE POLICY "meetings_rep_delete" ON public.meetings FOR DELETE
  USING (rep_id = public.current_rep_id());

-- signups
CREATE POLICY "signups_admin_all" ON public.signups FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "signups_rep_select" ON public.signups FOR SELECT
  USING (rep_id = public.current_rep_id());
CREATE POLICY "signups_rep_insert" ON public.signups FOR INSERT
  WITH CHECK (rep_id = public.current_rep_id());
CREATE POLICY "signups_rep_update" ON public.signups FOR UPDATE
  USING (rep_id = public.current_rep_id())
  WITH CHECK (rep_id = public.current_rep_id());

-- commissions
CREATE POLICY "commissions_admin_all" ON public.commissions FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "commissions_rep_select" ON public.commissions FOR SELECT
  USING (rep_id = public.current_rep_id());

-- activity_logs
CREATE POLICY "activity_admin_select" ON public.activity_logs FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "activity_self_select" ON public.activity_logs FOR SELECT
  USING (actor_id = auth.uid());
CREATE POLICY "activity_self_insert" ON public.activity_logs FOR INSERT
  WITH CHECK (actor_id = auth.uid());
