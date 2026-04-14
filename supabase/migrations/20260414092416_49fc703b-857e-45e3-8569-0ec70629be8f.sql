
-- Fix: payment_demands - restrict from authenticated ALL to admin + owner
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.payment_demands;

-- Admins have full access
CREATE POLICY "Admins full access payment demands"
ON public.payment_demands FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can view payment demands for their own event bookings
CREATE POLICY "Users can view own payment demands"
ON public.payment_demands FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.event_bookings eb
    WHERE eb.id = payment_demands.event_id
      AND eb.user_id = auth.uid()
  )
);
