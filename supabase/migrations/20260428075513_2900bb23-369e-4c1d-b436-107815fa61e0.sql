ALTER TABLE public.lead_links
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_lead_links_assigned_to_user_id
  ON public.lead_links(assigned_to_user_id)
  WHERE assigned_to_user_id IS NOT NULL;