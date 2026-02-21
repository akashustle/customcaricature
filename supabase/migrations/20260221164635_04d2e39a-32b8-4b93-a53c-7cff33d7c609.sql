-- Drop and recreate the payment_status check constraint to include partial statuses
ALTER TABLE public.event_bookings DROP CONSTRAINT event_bookings_payment_status_check;

ALTER TABLE public.event_bookings ADD CONSTRAINT event_bookings_payment_status_check 
CHECK (payment_status = ANY (ARRAY['pending'::text, 'partial_1_paid'::text, 'partial_2_paid'::text, 'confirmed'::text, 'partial'::text, 'fully_paid'::text, 'refunded'::text]));