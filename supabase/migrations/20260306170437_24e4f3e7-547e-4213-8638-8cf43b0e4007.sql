
-- Create enquiry_event_pricing table for location-based pricing
CREATE TABLE public.enquiry_event_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text,
  district text,
  city text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for fast lookups
CREATE INDEX idx_enquiry_event_pricing_state ON public.enquiry_event_pricing(state);
CREATE INDEX idx_enquiry_event_pricing_district ON public.enquiry_event_pricing(district);
CREATE INDEX idx_enquiry_event_pricing_city ON public.enquiry_event_pricing(city);

-- Enable RLS
ALTER TABLE public.enquiry_event_pricing ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage enquiry event pricing"
  ON public.enquiry_event_pricing FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active pricing
CREATE POLICY "Anyone can view enquiry event pricing"
  ON public.enquiry_event_pricing FOR SELECT
  USING (true);

-- Add estimated_price and pricing_source to enquiries
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS estimated_price numeric;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS pricing_source text;

-- Updated_at trigger
CREATE TRIGGER update_enquiry_event_pricing_updated_at
  BEFORE UPDATE ON public.enquiry_event_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
