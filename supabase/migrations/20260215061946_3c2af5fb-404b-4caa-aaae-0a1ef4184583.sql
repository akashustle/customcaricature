
-- Add event booking access control to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS event_booking_allowed boolean NOT NULL DEFAULT false;

-- Add admin site settings table for toggles (workshop button, event booking global toggle, etc.)
CREATE TABLE IF NOT EXISTS public.admin_site_settings (
  id text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read site settings
CREATE POLICY "Anyone can read site settings"
  ON public.admin_site_settings FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can manage site settings"
  ON public.admin_site_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.admin_site_settings (id, value) VALUES
  ('event_booking_global', '{"enabled": false}'::jsonb),
  ('workshop_button', '{"enabled": true, "label": "Workshop", "url": "https://creativecaricatureclub.com/workshop"}'::jsonb),
  ('event_booking_button', '{"enabled": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Add location fields to event_bookings
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS registration_lat double precision;
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS registration_lng double precision;
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS registration_location_name text;

-- Add location fields to profiles for registration tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_lat double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_lng double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_location_name text;
