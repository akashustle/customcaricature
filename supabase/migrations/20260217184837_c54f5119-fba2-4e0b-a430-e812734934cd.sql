
-- Create customer_event_pricing table for per-user event pricing
CREATE TABLE public.customer_event_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('mumbai', 'outside')),
  artist_count INTEGER NOT NULL DEFAULT 1,
  custom_total_price INTEGER NOT NULL,
  custom_advance_amount INTEGER NOT NULL,
  custom_extra_hour_rate INTEGER NOT NULL DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, region, artist_count)
);

-- Enable RLS
ALTER TABLE public.customer_event_pricing ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage customer event pricing"
ON public.customer_event_pricing
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own event pricing"
ON public.customer_event_pricing
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
