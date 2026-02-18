-- Update track_order to support both full UUID and short ID (first 8 chars)
-- Also add updated_at to track delivery date/time
DROP FUNCTION IF EXISTS public.track_order(text);

CREATE OR REPLACE FUNCTION public.track_order(order_id_input text)
RETURNS TABLE(
  id uuid, 
  order_type text, 
  style text, 
  amount integer, 
  status text, 
  payment_status text, 
  created_at timestamp with time zone, 
  expected_delivery_date date, 
  face_count integer,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.id, o.order_type::text, o.style::text, o.amount, o.status::text, 
         o.payment_status, o.created_at, o.expected_delivery_date, o.face_count,
         o.updated_at
  FROM orders o
  WHERE o.id::text = order_id_input
     OR lower(left(o.id::text, 8)) = lower(order_id_input)
  LIMIT 1;
$$;