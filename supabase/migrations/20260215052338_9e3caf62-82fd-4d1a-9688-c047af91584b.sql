
-- Create event_pricing table for admin-controlled pricing
CREATE TABLE public.event_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region text NOT NULL, -- 'mumbai' or 'outside'
  artist_count integer NOT NULL DEFAULT 1,
  total_price integer NOT NULL DEFAULT 0,
  advance_amount integer NOT NULL DEFAULT 0,
  extra_hour_rate integer NOT NULL DEFAULT 5000,
  valid_until date NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(region, artist_count)
);

-- Enable RLS
ALTER TABLE public.event_pricing ENABLE ROW LEVEL SECURITY;

-- Anyone can view pricing
CREATE POLICY "Anyone can view event pricing" ON public.event_pricing FOR SELECT USING (true);

-- Only admins can manage pricing
CREATE POLICY "Admins can manage event pricing" ON public.event_pricing FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for instant sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_pricing;

-- Insert default pricing data
INSERT INTO public.event_pricing (region, artist_count, total_price, advance_amount, extra_hour_rate, valid_until) VALUES
  ('mumbai', 1, 30000, 20000, 4000, '2026-10-20'),
  ('mumbai', 2, 50000, 35000, 4000, '2026-10-20'),
  ('outside', 1, 40000, 25000, 5000, '2026-10-20'),
  ('outside', 2, 70000, 45000, 5000, '2026-10-20');

-- Add time fields to artist_blocked_dates
ALTER TABLE public.artist_blocked_dates 
  ADD COLUMN IF NOT EXISTS blocked_start_time time without time zone NULL,
  ADD COLUMN IF NOT EXISTS blocked_end_time time without time zone NULL;
