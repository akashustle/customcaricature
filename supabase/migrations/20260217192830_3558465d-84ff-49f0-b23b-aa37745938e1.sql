-- Remove the restrictive event_type check constraint to allow custom event types
ALTER TABLE public.event_bookings DROP CONSTRAINT event_bookings_event_type_check;

-- Also update artist_count to support up to 5 artists (per event management memory)
ALTER TABLE public.event_bookings DROP CONSTRAINT event_bookings_artist_count_check;
ALTER TABLE public.event_bookings ADD CONSTRAINT event_bookings_artist_count_check CHECK (artist_count >= 1 AND artist_count <= 5);