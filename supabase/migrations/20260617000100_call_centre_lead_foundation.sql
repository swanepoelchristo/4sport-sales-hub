-- PR #6: Call centre lead workflow foundation
-- Scope:
-- - call_center_agent role support
-- - call_center_agents profile table
-- - public-info lead safety fields
-- - lead activity / call notes / outcome logging
-- - cautious RLS for active call centre agents only
--
-- Not included:
-- - scraping
-- - WhatsApp changes
-- - payment automation
-- - Docker/env changes

-- 1) Add call_center_agent to app_role enum.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'app_role'
      AND e.enumlabel = 'call_center_agent'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'call_center_agent';
  END IF;
END $$;

-- 2) Call centre agent profile table.
CREATE TABLE IF NOT EXISTS public.call_center_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_center_agents_auth_user_id
  ON public.call_center_agents(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_call_center_agents_status
  ON public.call_center_agents(status);

DROP TRIGGER IF EXISTS trg_call_center_agents_upd ON public.call_center_agents;
CREATE TRIGGER trg_call_center_agents_upd
BEFORE UPDATE ON public.call_center_agents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Helper functions.
CREATE OR REPLACE FUNCTION public.current_call_center_agent_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.call_center_agents
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_call_center_agent()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'call_center_agent'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_call_center_agent()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.call_center_agents
    WHERE auth_user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- 4) Harden auth user profile creation.
-- Only the call centre invite path may create a call_center_agent profile.
-- Raw metadata must never allow a random user to become admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text := COALESCE(NEW.raw_user_meta_data->>'role', '');
  invite_code text := COALESCE(NEW.raw_user_meta_data->>'call_center_invite_code', '');
  safe_role_text text := 'sales_rep';
BEGIN
  IF requested_role = 'call_center_agent'
     AND invite_code = '4SPORT-CALLCENTER-2026' THEN
    safe_role_text := 'call_center_agent';
  END IF;

  EXECUTE '
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES ($1, $2, $3, $4::public.app_role)
    ON CONFLICT (id) DO NOTHING
  '
  USING
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    safe_role_text;

  RETURN NEW;
END $$;

-- 5) Auto-create call centre agent profile after invited signup.
CREATE OR REPLACE FUNCTION public.handle_new_call_center_agent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text := COALESCE(NEW.raw_user_meta_data->>'role', '');
  invite_code text := COALESCE(NEW.raw_user_meta_data->>'call_center_invite_code', '');
BEGIN
  IF requested_role = 'call_center_agent'
     AND invite_code = '4SPORT-CALLCENTER-2026' THEN
    INSERT INTO public.call_center_agents (
      auth_user_id,
      name,
      email,
      phone,
      status
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      'pending'
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_call_center_agent_created ON auth.users;
CREATE TRIGGER on_auth_call_center_agent_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_call_center_agent();

-- 6) Add call-centre-safe lead fields to existing leads table.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS public_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS public_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES public.call_center_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS do_not_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_call_outcome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_call_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

UPDATE public.leads
SET
  public_phone = COALESCE(NULLIF(public_phone, ''), phone, ''),
  public_email = COALESCE(NULLIF(public_email, ''), email, ''),
  source_note = COALESCE(NULLIF(source_note, ''), lead_source, '')
WHERE public_phone = ''
   OR public_email = ''
   OR source_note = '';

CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent_id
  ON public.leads(assigned_agent_id);

CREATE INDEX IF NOT EXISTS idx_leads_do_not_contact
  ON public.leads(do_not_contact);

CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up
  ON public.leads(next_follow_up);

-- 7) Lead activity table for calls, notes, outcomes, and follow-ups.
CREATE TABLE IF NOT EXISTS public.lead_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.call_center_agents(id) ON DELETE SET NULL,
  activity_type text NOT NULL
    CHECK (activity_type IN ('call', 'note', 'email', 'meeting', 'status_change')),
  outcome text NOT NULL DEFAULT ''
    CHECK (
      outcome = ''
      OR outcome IN (
        'no_answer',
        'interested',
        'not_interested',
        'call_back_later',
        'meeting_booked',
        'converted',
        'do_not_contact'
      )
    ),
  notes text NOT NULL DEFAULT '',
  next_follow_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activity_lead_id
  ON public.lead_activity(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_activity_agent_id
  ON public.lead_activity(agent_id);

CREATE INDEX IF NOT EXISTS idx_lead_activity_created_at
  ON public.lead_activity(created_at DESC);

-- 8) Apply latest call outcome back onto the lead summary.
CREATE OR REPLACE FUNCTION public.apply_lead_activity_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
  SET
    last_call_outcome = COALESCE(NULLIF(NEW.outcome, ''), last_call_outcome),
    last_call_note = COALESCE(NULLIF(NEW.notes, ''), last_call_note),
    last_contacted_at = CASE
      WHEN NEW.activity_type = 'call' THEN NEW.created_at
      ELSE last_contacted_at
    END,
    next_follow_up = COALESCE(NEW.next_follow_up_at, next_follow_up),
    do_not_contact = CASE
      WHEN NEW.outcome = 'do_not_contact' THEN true
      ELSE do_not_contact
    END,
    status = CASE
      WHEN NEW.outcome = 'interested' THEN 'Interested'::public.lead_status
      WHEN NEW.outcome = 'not_interested' THEN 'Not Interested'::public.lead_status
      WHEN NEW.outcome = 'meeting_booked' THEN 'Meeting Scheduled'::public.lead_status
      WHEN NEW.outcome = 'converted' THEN 'Signed'::public.lead_status
      WHEN NEW.outcome IN ('no_answer', 'call_back_later') THEN 'Contacted'::public.lead_status
      WHEN NEW.outcome = 'do_not_contact' THEN 'Not Interested'::public.lead_status
      ELSE status
    END
  WHERE id = NEW.lead_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_lead_activity_summary ON public.lead_activity;
CREATE TRIGGER trg_apply_lead_activity_summary
AFTER INSERT ON public.lead_activity
FOR EACH ROW EXECUTE FUNCTION public.apply_lead_activity_summary();

-- 9) RLS.
ALTER TABLE public.call_center_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS call_center_agents_admin_all ON public.call_center_agents;
CREATE POLICY call_center_agents_admin_all
ON public.call_center_agents
FOR ALL TO public
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS call_center_agents_self_read ON public.call_center_agents;
CREATE POLICY call_center_agents_self_read
ON public.call_center_agents
FOR SELECT TO public
USING (auth_user_id = auth.uid());

-- Active call centre agents may see unassigned leads and their own assigned leads.
DROP POLICY IF EXISTS leads_call_center_select ON public.leads;
CREATE POLICY leads_call_center_select
ON public.leads
FOR SELECT TO public
USING (
  public.is_active_call_center_agent()
  AND (
    assigned_agent_id = public.current_call_center_agent_id()
    OR assigned_agent_id IS NULL
  )
);

-- Active call centre agents may update unassigned leads or their own leads.
-- This allows "claim next lead" and outcome updates, but not bulk admin work.
DROP POLICY IF EXISTS leads_call_center_update ON public.leads;
CREATE POLICY leads_call_center_update
ON public.leads
FOR UPDATE TO public
USING (
  public.is_active_call_center_agent()
  AND (
    assigned_agent_id = public.current_call_center_agent_id()
    OR assigned_agent_id IS NULL
  )
)
WITH CHECK (
  public.is_active_call_center_agent()
  AND (
    assigned_agent_id = public.current_call_center_agent_id()
    OR assigned_agent_id IS NULL
  )
);

DROP POLICY IF EXISTS lead_activity_admin_all ON public.lead_activity;
CREATE POLICY lead_activity_admin_all
ON public.lead_activity
FOR ALL TO public
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS lead_activity_call_center_select ON public.lead_activity;
CREATE POLICY lead_activity_call_center_select
ON public.lead_activity
FOR SELECT TO public
USING (
  public.is_active_call_center_agent()
  AND EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = lead_activity.lead_id
      AND (
        l.assigned_agent_id = public.current_call_center_agent_id()
        OR l.assigned_agent_id IS NULL
      )
  )
);

DROP POLICY IF EXISTS lead_activity_call_center_insert ON public.lead_activity;
CREATE POLICY lead_activity_call_center_insert
ON public.lead_activity
FOR INSERT TO public
WITH CHECK (
  public.is_active_call_center_agent()
  AND agent_id = public.current_call_center_agent_id()
  AND EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = lead_activity.lead_id
      AND (
        l.assigned_agent_id = public.current_call_center_agent_id()
        OR l.assigned_agent_id IS NULL
      )
  )
);

DROP POLICY IF EXISTS lead_activity_rep_select ON public.lead_activity;
CREATE POLICY lead_activity_rep_select
ON public.lead_activity
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = lead_activity.lead_id
      AND l.assigned_rep_id = public.current_rep_id()
  )
);
