
-- Drop both overloads
DROP FUNCTION IF EXISTS public.track_order(text);
DROP FUNCTION IF EXISTS public.track_order(text, text);

-- Recreate with customer_verify as required (no DEFAULT NULL)
CREATE FUNCTION public.track_order(order_id_input text, customer_verify text)
 RETURNS TABLE(id uuid, order_type text, style text, amount integer, status text, payment_status text, created_at timestamp with time zone, expected_delivery_date date, face_count integer, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT o.id, o.order_type::text, o.style::text, o.amount, o.status::text, 
         o.payment_status, o.created_at, o.expected_delivery_date, o.face_count,
         o.updated_at
  FROM orders o
  WHERE (o.id::text = order_id_input
     OR lower(left(o.id::text, 8)) = lower(order_id_input))
    AND (
      lower(o.customer_email) = lower(customer_verify)
      OR o.customer_mobile = customer_verify
    )
  LIMIT 1;
$function$;
