
-- 1. Soft-delete columns (idempotent)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.signups
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.reps
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS region_manager_id uuid;

-- 2. lead_attachments table
CREATE TABLE IF NOT EXISTS public.lead_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL,
  uploaded_by uuid,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text NOT NULL DEFAULT '',
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_attachments_lead_id ON public.lead_attachments(lead_id);

ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attachments_admin_all ON public.lead_attachments;
CREATE POLICY attachments_admin_all ON public.lead_attachments
  FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS attachments_rep_select ON public.lead_attachments;
CREATE POLICY attachments_rep_select ON public.lead_attachments
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_attachments.lead_id
      AND l.assigned_rep_id = public.current_rep_id()
  ));

DROP POLICY IF EXISTS attachments_rep_insert ON public.lead_attachments;
CREATE POLICY attachments_rep_insert ON public.lead_attachments
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_attachments.lead_id
      AND l.assigned_rep_id = public.current_rep_id()
  ));

DROP POLICY IF EXISTS attachments_rep_delete ON public.lead_attachments;
CREATE POLICY attachments_rep_delete ON public.lead_attachments
  FOR DELETE TO public
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_attachments.lead_id
      AND l.assigned_rep_id = public.current_rep_id()
  ));

-- 3. Storage bucket (private) + policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-attachments', 'lead-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "lead_attach_admin_all" ON storage.objects;
CREATE POLICY "lead_attach_admin_all" ON storage.objects
  FOR ALL TO public
  USING (bucket_id = 'lead-attachments' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'lead-attachments' AND public.has_role(auth.uid(), 'admin'));

-- rep can read/write objects under leads/<lead_id>/... for leads they own
DROP POLICY IF EXISTS "lead_attach_rep_select" ON storage.objects;
CREATE POLICY "lead_attach_rep_select" ON storage.objects
  FOR SELECT TO public
  USING (
    bucket_id = 'lead-attachments'
    AND (storage.foldername(name))[1] = 'leads'
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id::text = (storage.foldername(name))[2]
        AND l.assigned_rep_id = public.current_rep_id()
    )
  );

DROP POLICY IF EXISTS "lead_attach_rep_insert" ON storage.objects;
CREATE POLICY "lead_attach_rep_insert" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (
    bucket_id = 'lead-attachments'
    AND (storage.foldername(name))[1] = 'leads'
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id::text = (storage.foldername(name))[2]
        AND l.assigned_rep_id = public.current_rep_id()
    )
  );

DROP POLICY IF EXISTS "lead_attach_rep_delete" ON storage.objects;
CREATE POLICY "lead_attach_rep_delete" ON storage.objects
  FOR DELETE TO public
  USING (
    bucket_id = 'lead-attachments'
    AND (storage.foldername(name))[1] = 'leads'
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id::text = (storage.foldername(name))[2]
        AND l.assigned_rep_id = public.current_rep_id()
    )
  );

-- 4. updated_at trigger on lead_attachments not needed (no updated_at column)
