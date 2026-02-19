-- Allow admins to create orders (fixes RLS violation on manual order creation)
CREATE POLICY "Admins can create orders"
ON public.orders
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert order images for manual orders
CREATE POLICY "Admins can insert order images"
ON public.order_images
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));