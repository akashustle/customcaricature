
-- Create user_live_locations table for real-time location tracking
CREATE TABLE public.user_live_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  city text,
  location_name text,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.user_live_locations ENABLE ROW LEVEL SECURITY;

-- Users can upsert their own location
CREATE POLICY "Users can upsert own location"
ON public.user_live_locations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own location"
ON public.user_live_locations FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all locations
CREATE POLICY "Admins can view all locations"
ON public.user_live_locations FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Users can view own location
CREATE POLICY "Users can view own location"
ON public.user_live_locations FOR SELECT
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_live_locations;
