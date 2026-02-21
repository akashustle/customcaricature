
-- =====================================================
-- FIX 1: Break infinite recursion between event_bookings 
-- and event_artist_assignments RLS policies
-- =====================================================

-- Create SECURITY DEFINER function to check if user owns an event booking
-- This bypasses RLS and breaks the circular reference
CREATE OR REPLACE FUNCTION public.user_owns_event_booking(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_bookings
    WHERE id = _event_id AND user_id = _user_id
  )
$$;

-- Create SECURITY DEFINER function to check if user is an assigned artist for an event
CREATE OR REPLACE FUNCTION public.artist_assigned_to_event(_auth_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_artist_assignments eaa
    JOIN public.artists a ON a.id = eaa.artist_id
    WHERE eaa.event_id = _event_id AND a.auth_user_id = _auth_user_id
  )
$$;

-- Drop the recursive policy on event_artist_assignments
DROP POLICY IF EXISTS "Users can view own event artist assignments" ON public.event_artist_assignments;

-- Recreate using SECURITY DEFINER function (no more circular reference)
CREATE POLICY "Users can view own event artist assignments"
ON public.event_artist_assignments
FOR SELECT
USING (public.user_owns_event_booking(auth.uid(), event_id));

-- Drop the recursive policy on event_bookings
DROP POLICY IF EXISTS "Artists can view events via assignments" ON public.event_bookings;

-- Recreate using SECURITY DEFINER function
CREATE POLICY "Artists can view events via assignments"
ON public.event_bookings
FOR SELECT
USING (public.artist_assigned_to_event(auth.uid(), id));

-- =====================================================
-- FIX 2: Partial Advance Payment Configuration Table
-- =====================================================

CREATE TABLE public.user_partial_advance_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  partial_1_amount integer NOT NULL DEFAULT 0,
  partial_2_amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_partial_advance_config ENABLE ROW LEVEL SECURITY;

-- Admins can manage all configs
CREATE POLICY "Admins can manage partial advance config"
ON public.user_partial_advance_config
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own config
CREATE POLICY "Users can view own partial advance config"
ON public.user_partial_advance_config
FOR SELECT
USING (auth.uid() = user_id);

-- Enable realtime for partial advance config
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_partial_advance_config;

-- Create trigger for updated_at
CREATE TRIGGER update_user_partial_advance_config_updated_at
BEFORE UPDATE ON public.user_partial_advance_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
