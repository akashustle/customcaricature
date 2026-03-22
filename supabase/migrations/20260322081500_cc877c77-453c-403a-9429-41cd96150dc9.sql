
-- Add source, follow_up_date, assigned_to, budget columns to enquiries
ALTER TABLE public.enquiries 
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS follow_up_date timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS budget numeric;

-- Create lead_follow_ups table for follow-up history
CREATE TABLE IF NOT EXISTS public.lead_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid REFERENCES public.enquiries(id) ON DELETE CASCADE NOT NULL,
  note text NOT NULL,
  follow_up_type text DEFAULT 'manual',
  scheduled_at timestamptz,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lead_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage follow-ups" ON public.lead_follow_ups
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for follow-ups
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_follow_ups;
