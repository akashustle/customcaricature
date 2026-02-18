-- Fix 1: Drop and recreate track_order without customer_name, using exact match
DROP FUNCTION IF EXISTS public.track_order(text);

CREATE FUNCTION public.track_order(order_id_input text)
 RETURNS TABLE(id uuid, order_type text, style text, amount integer, status text, payment_status text, created_at timestamp with time zone, expected_delivery_date date, face_count integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT o.id, o.order_type::text, o.style::text, o.amount, o.status::text, 
         o.payment_status, o.created_at, o.expected_delivery_date, o.face_count
  FROM orders o
  WHERE o.id::text = order_id_input
  LIMIT 1;
$$;

-- Fix 2: Add artist self-update policy
CREATE POLICY "Artists can update own contact info"
ON public.artists FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());