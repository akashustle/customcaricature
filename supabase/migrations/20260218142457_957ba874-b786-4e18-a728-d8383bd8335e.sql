
-- Fix: Update payment_status check constraint to allow all needed values
ALTER TABLE public.event_bookings DROP CONSTRAINT IF EXISTS event_bookings_payment_status_check;
ALTER TABLE public.event_bookings ADD CONSTRAINT event_bookings_payment_status_check 
  CHECK (payment_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'partial'::text, 'fully_paid'::text, 'refunded'::text]));
