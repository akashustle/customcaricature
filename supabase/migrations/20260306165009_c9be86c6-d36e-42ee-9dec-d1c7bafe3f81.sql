
-- Enquiries table for Lead CRM
CREATE TABLE public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_number text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  mobile text NOT NULL,
  instagram_id text,
  enquiry_type text NOT NULL DEFAULT 'custom_caricature',
  caricature_type text,
  country text DEFAULT 'India',
  state text,
  district text,
  city text,
  event_date date,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- RLS: Admins manage all, anyone can insert
CREATE POLICY "Admins can manage all enquiries" ON public.enquiries FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can insert enquiries" ON public.enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own enquiries" ON public.enquiries FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Sequence for enquiry numbers
CREATE SEQUENCE IF NOT EXISTS enquiry_number_seq START 1;

-- Function to auto-generate enquiry number
CREATE OR REPLACE FUNCTION public.generate_enquiry_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.enquiry_number := 'ENQ-' || EXTRACT(YEAR FROM NOW())::text || '-' || lpad(nextval('enquiry_number_seq')::text, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_enquiry_number
  BEFORE INSERT ON public.enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_enquiry_number();

-- Enquiry settings for admin-controlled content
CREATE TABLE public.enquiry_settings (
  id text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enquiry_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage enquiry settings" ON public.enquiry_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view enquiry settings" ON public.enquiry_settings FOR SELECT USING (true);

-- Seed default enquiry settings
INSERT INTO public.enquiry_settings (id, value) VALUES
  ('caricature_descriptions', '{"single": {"title": "Single Face Caricature", "description": "A personalized caricature featuring one person. Perfect for gifts, social media profiles, and personal keepsakes.", "delivery_days": 5}, "couple": {"title": "Couple Caricature", "description": "A beautiful caricature of two people together. Ideal for anniversaries, weddings, and couple gifts.", "delivery_days": 7}, "group": {"title": "Group Caricature", "description": "A fun group caricature with 3-6 faces. Great for family portraits, friend groups, and team gifts.", "delivery_days": 10}}'::jsonb),
  ('contact_info', '{"whatsapp": "918369594271", "instagram": "https://instagram.com/creativecaricatureclub"}'::jsonb),
  ('event_max_per_date', '{"max_events": 2}'::jsonb);

-- Event blocked dates table for calendar capacity
CREATE TABLE public.event_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date date NOT NULL,
  reason text,
  blocked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage event blocked dates" ON public.event_blocked_dates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view event blocked dates" ON public.event_blocked_dates FOR SELECT USING (true);

-- Enable realtime for enquiries
ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiries;
