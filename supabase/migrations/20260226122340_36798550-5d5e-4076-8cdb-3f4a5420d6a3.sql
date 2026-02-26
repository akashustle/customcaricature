
-- International event pricing table
CREATE TABLE public.international_event_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  artist_count integer NOT NULL DEFAULT 1,
  total_price integer NOT NULL DEFAULT 0,
  advance_amount integer NOT NULL DEFAULT 0,
  extra_hour_rate integer NOT NULL DEFAULT 5000,
  currency text NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.international_event_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage international event pricing"
  ON public.international_event_pricing FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view international event pricing"
  ON public.international_event_pricing FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Customer-specific international event pricing
CREATE TABLE public.customer_international_event_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  country text NOT NULL,
  artist_count integer NOT NULL DEFAULT 1,
  custom_total_price integer NOT NULL,
  custom_advance_amount integer NOT NULL,
  custom_extra_hour_rate integer NOT NULL DEFAULT 5000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_international_event_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customer intl event pricing"
  ON public.customer_international_event_pricing FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own intl event pricing"
  ON public.customer_international_event_pricing FOR SELECT
  USING (auth.uid() = user_id);

-- Add international booking allowed flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS international_booking_allowed boolean NOT NULL DEFAULT false;

-- Add international event booking columns to event_bookings
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'India';
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS is_international boolean NOT NULL DEFAULT false;

-- Add realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.international_event_pricing;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_international_event_pricing;
