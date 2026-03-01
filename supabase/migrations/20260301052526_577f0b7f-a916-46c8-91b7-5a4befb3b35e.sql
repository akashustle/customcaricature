
CREATE OR REPLACE FUNCTION public.track_order(order_id_input text, customer_verify text DEFAULT NULL)
 RETURNS TABLE(id uuid, order_type text, style text, amount integer, status text, payment_status text, created_at timestamp with time zone, expected_delivery_date date, face_count integer, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT o.id, o.order_type::text, o.style::text, o.amount, o.status::text, 
         o.payment_status, o.created_at, o.expected_delivery_date, o.face_count,
         o.updated_at
  FROM orders o
  WHERE (o.id::text = order_id_input
     OR lower(left(o.id::text, 8)) = lower(order_id_input))
    AND (
      customer_verify IS NULL 
      OR lower(o.customer_email) = lower(customer_verify)
      OR o.customer_mobile = customer_verify
    )
  LIMIT 1;
$$;
