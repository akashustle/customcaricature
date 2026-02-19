-- Allow artists to view event bookings they're assigned to via event_artist_assignments
CREATE POLICY "Artists can view events via assignments"
ON public.event_bookings
FOR SELECT
USING (
  id IN (
    SELECT eaa.event_id 
    FROM public.event_artist_assignments eaa
    JOIN public.artists a ON a.id = eaa.artist_id
    WHERE a.auth_user_id = auth.uid()
  )
);