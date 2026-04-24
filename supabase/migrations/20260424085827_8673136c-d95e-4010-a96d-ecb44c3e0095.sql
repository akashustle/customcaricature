-- Make admin status / payment_status changes fully flexible.
-- The previous CHECK constraints rejected valid values like 'live' (used by auto_complete_past_events trigger)
-- and forced silent failures when admins picked statuses outside the narrow allowlist.

ALTER TABLE public.event_bookings DROP CONSTRAINT IF EXISTS event_bookings_status_check;
ALTER TABLE public.event_bookings DROP CONSTRAINT IF EXISTS event_bookings_payment_status_check;

-- Replace with a permissive constraint: non-empty short string. Admin is fully in control.
ALTER TABLE public.event_bookings
  ADD CONSTRAINT event_bookings_status_check
  CHECK (status IS NULL OR (length(status) BETWEEN 1 AND 40));

ALTER TABLE public.event_bookings
  ADD CONSTRAINT event_bookings_payment_status_check
  CHECK (payment_status IS NULL OR (length(payment_status) BETWEEN 1 AND 40));