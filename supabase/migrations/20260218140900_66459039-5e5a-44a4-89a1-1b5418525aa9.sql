
-- Fix 1: Restrict event_pricing to authenticated users only
DROP POLICY IF EXISTS "Anyone can view event pricing" ON public.event_pricing;
CREATE POLICY "Authenticated users can view event pricing"
  ON public.event_pricing FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 2: Require authentication for order creation
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Fix 3: Drop permissive storage upload policy and add authenticated-only
DROP POLICY IF EXISTS "Anyone can upload order photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload order photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'order-photos' AND auth.uid() IS NOT NULL);
