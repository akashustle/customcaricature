
-- Drop and recreate track_order to accept text (short ID or full UUID)
DROP FUNCTION IF EXISTS public.track_order(uuid);

CREATE OR REPLACE FUNCTION public.track_order(order_id_input text)
RETURNS TABLE(
  id uuid, order_type text, style text, amount integer, status text, 
  payment_status text, created_at timestamptz, expected_delivery_date date, 
  customer_name text, face_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.id, o.order_type::text, o.style::text, o.amount, o.status::text, 
         o.payment_status, o.created_at, o.expected_delivery_date, o.customer_name, o.face_count
  FROM orders o
  WHERE o.id::text ILIKE order_id_input || '%'
  LIMIT 1;
$$;
