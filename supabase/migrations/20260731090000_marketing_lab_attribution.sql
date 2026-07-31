-- 4SPORT Marketing Lab foundation
-- Additive only: campaign/creative records plus attribution fields on leads.

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code text NOT NULL UNIQUE,
  name text NOT NULL,
  objective text NOT NULL CHECK (objective IN ('book_demo', 'generate_enquiry', 'awareness')),
  audience text NOT NULL CHECK (audience IN ('principals', 'heads_of_sport', 'coaches', 'parents', 'mixed')),
  angle text NOT NULL CHECK (angle IN ('administration', 'safety', 'communication', 'fixtures', 'platform')),
  budget_zar numeric(12,2) NOT NULL DEFAULT 0 CHECK (budget_zar >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'active', 'paused', 'completed')),
  landing_path text NOT NULL DEFAULT '/schools',
  external_campaign_id text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  creative_code text NOT NULL UNIQUE,
  headline text NOT NULL DEFAULT '',
  primary_text text NOT NULL DEFAULT '',
  call_to_action text NOT NULL DEFAULT 'Book a demo',
  asset_type text NOT NULL DEFAULT 'text' CHECK (asset_type IN ('image', 'video', 'text')),
  external_creative_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status
  ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_creatives_campaign_id
  ON public.marketing_creatives(campaign_id);

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS marketing_campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS marketing_creative_id uuid REFERENCES public.marketing_creatives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS marketing_campaign_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS marketing_creative_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_source text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_medium text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_campaign text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS landing_path text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_leads_marketing_campaign_id
  ON public.leads(marketing_campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_marketing_campaign_code
  ON public.leads(marketing_campaign_code)
  WHERE marketing_campaign_code <> '';

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_creatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_campaigns_admin_all ON public.marketing_campaigns;
CREATE POLICY marketing_campaigns_admin_all
ON public.marketing_campaigns
FOR ALL TO public
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS marketing_creatives_admin_all ON public.marketing_creatives;
CREATE POLICY marketing_creatives_admin_all
ON public.marketing_creatives
FOR ALL TO public
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_marketing_campaigns_upd ON public.marketing_campaigns;
CREATE TRIGGER trg_marketing_campaigns_upd
BEFORE UPDATE ON public.marketing_campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_marketing_creatives_upd ON public.marketing_creatives;
CREATE TRIGGER trg_marketing_creatives_upd
BEFORE UPDATE ON public.marketing_creatives
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
