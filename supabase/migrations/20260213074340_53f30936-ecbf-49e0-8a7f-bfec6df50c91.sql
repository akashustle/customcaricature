-- Allow public to track orders by ID (read-only, limited fields)
CREATE POLICY "Anyone can view order status by ID"
ON public.orders
FOR SELECT
USING (true);

-- Note: This replaces restrictive select policies. We'll rely on the frontend
-- to only query specific order IDs for tracking.
-- Actually, let's not do a broad policy. Instead, create a function.

-- Drop the above since it's too broad
DROP POLICY IF EXISTS "Anyone can view order status by ID" ON public.orders;

-- Create a secure function for order tracking
CREATE OR REPLACE FUNCTION public.track_order(order_uuid UUID)
RETURNS TABLE (
  id UUID,
  order_type text,
  style text,
  amount integer,
  status text,
  payment_status text,
  created_at timestamptz,
  expected_delivery_date date,
  customer_name text,
  face_count integer
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.order_type::text, o.style::text, o.amount, o.status::text, o.payment_status, o.created_at, o.expected_delivery_date, o.customer_name, o.face_count
  FROM orders o
  WHERE o.id = order_uuid;
$$;