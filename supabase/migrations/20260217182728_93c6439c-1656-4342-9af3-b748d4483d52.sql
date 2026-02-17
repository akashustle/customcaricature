
-- Add missing columns to artists table
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) UNIQUE;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS mobile TEXT;

-- Add 'artist' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'artist';

-- RLS: Artists can view their own profile
CREATE POLICY "Artists can view own artist profile"
ON public.artists FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- RLS: Artists can view their assigned events
CREATE POLICY "Artists can view assigned events"
ON public.event_bookings FOR SELECT
TO authenticated
USING (
  assigned_artist_id IN (
    SELECT id FROM public.artists WHERE auth_user_id = auth.uid()
  )
);
