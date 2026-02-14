
-- Event bookings table
CREATE TABLE public.event_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_mobile TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_instagram TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('wedding', 'corporate', 'birthday', 'other')),
  event_date DATE NOT NULL,
  event_start_time TIME NOT NULL,
  event_end_time TIME NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  full_address TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  pincode TEXT NOT NULL,
  artist_count INTEGER NOT NULL DEFAULT 1 CHECK (artist_count IN (1, 2)),
  is_mumbai BOOLEAN NOT NULL DEFAULT false,
  total_price INTEGER NOT NULL,
  advance_amount INTEGER NOT NULL,
  remaining_amount INTEGER GENERATED ALWAYS AS (total_price - advance_amount) STORED,
  extra_hours INTEGER NOT NULL DEFAULT 0,
  travel_confirmed BOOLEAN NOT NULL DEFAULT false,
  accommodation_confirmed BOOLEAN NOT NULL DEFAULT false,
  negotiated BOOLEAN NOT NULL DEFAULT false,
  negotiated_total INTEGER,
  negotiated_advance INTEGER,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'partial')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_bookings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can create event bookings"
  ON public.event_bookings FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own event bookings"
  ON public.event_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all event bookings"
  ON public.event_bookings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins can update event bookings"
  ON public.event_bookings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins can delete event bookings"
  ON public.event_bookings FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Artist availability / blocked dates
CREATE TABLE public.artist_blocked_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date DATE NOT NULL,
  city TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked dates"
  ON public.artist_blocked_dates FOR SELECT USING (true);

CREATE POLICY "Admins can manage blocked dates"
  ON public.artist_blocked_dates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_event_bookings_updated_at
  BEFORE UPDATE ON public.event_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_bookings;
