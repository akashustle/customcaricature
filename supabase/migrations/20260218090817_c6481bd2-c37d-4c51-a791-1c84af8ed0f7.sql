
-- Create event_artist_assignments table for multiple artists per event
CREATE TABLE public.event_artist_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, artist_id)
);

-- Enable RLS
ALTER TABLE public.event_artist_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage assignments
CREATE POLICY "Admins can manage event artist assignments"
  ON public.event_artist_assignments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view assignments for their own events
CREATE POLICY "Users can view own event artist assignments"
  ON public.event_artist_assignments
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM public.event_bookings WHERE user_id = auth.uid()
    )
  );

-- Artists can view their own assignments
CREATE POLICY "Artists can view own assignments"
  ON public.event_artist_assignments
  FOR SELECT
  USING (
    artist_id IN (
      SELECT id FROM public.artists WHERE auth_user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_artist_assignments;
